import re
import os
from functools import reduce
from datetime import datetime, date

def parse_post(infile, new_id):

    def parse_header(infile, np_res):

        header = { 'title':'', 'location':'', 'date':'', 'tags': []}

        fv_pattern = r"(\ )*(?P<field>\w+)(\ )*::(\ )*(?P<value>(\w|[!?,\-\–\:\+\.\ ])+)*"
        end_pattern = r"=*"

        fv_pattern_c = re.compile(fv_pattern)
        end_pattern_c = re.compile(end_pattern)
        
        s = infile.readline()
        while len(s) > 0 and end_pattern_c.match(s).span() == (0,0):
            m = fv_pattern_c.match(s)

            if m.group('field') in header:
                header[m.group('field')] = m.group('value').lstrip(' ').rstrip(' ')
            else:
                raise Exception("Wrong header field: {0}".format(m.group('field')))

            s = infile.readline()

        if header['title'] == '':
            raise Exception("Empty title")
        
        if header['date'] == '':
            dt = datetime
            header['date'] = "{0}-{1}-{2}".format(dt.now().year, dt.now().month, dt.now().day)
        else:
            date_pattern = r"(?P<year>\d+)-(?P<month>\d+)-(?P<day>\d+)"
            mt = re.match(date_pattern, header['date'])

            y, m, d = (int(mt.group('year')), int(mt.group('month')), int(mt.group('day')))
            if not (y > 0 and m >= 1 and m <= 12 and d >= 1 and d <= 31):
                raise Exception('Wrong date format')

        if header['tags'] != []:
            tags_pattern = r"((\w|[!?,-])+)"
            
            mt = re.findall(tags_pattern, header['tags'])
            header['tags'] = [q[0] for q in mt]

        return header

    def parse_contents(infile, np_res, new_id):

        class Content():
            __terminating_patterns_c = None
            __gen_pattern_c = None
            __parse_line = None
            name = None
    
            def __init__(self, name, gen_pattern, terminating_patterns):
                self.__terminating_patterns_c = list(re.compile(x) for x in terminating_patterns)
                self.__gen_pattern_c = re.compile(gen_pattern)
                self.name = name

            def __is_terminate__(self, s):
                return reduce(lambda x, y: x or (y.match(s) != None), self.__terminating_patterns_c, False)

            def check(self, s):
                if len(s) != 0:
                    return self.__gen_pattern_c.match(s) != None
                else:
                    return False
 
        class Paragraph(Content):
            def process(self, infile):
                tmp = ''
                lst = infile.tell()
                s = infile.readline()
                while len(s) != 0 and not self.__is_terminate__(s):
                    if s.split(' ') != []:
                        tmp = tmp + s[:-1] + (' ' if s[len(s) - 1] != ' ' else '')
                    lst = infile.tell()
                    s = infile.readline()
                infile.seek(lst)
                return {self.name : tmp}

        class Code(Content):
            def process(self, infile):
                tmp = ''
                lst = infile.tell()
                s = infile.readline()
                while len(s) != 0 and not self.__is_terminate__(s):
                    tmp += s[:-1] + '\n'
                    lst = infile.tell()
                    s = infile.readline()
                infile.seek(lst)
                return {self.name : tmp}

        class List(Content):
            def process(self, infile):
                tmp = []
                lst = infile.tell()
                s = infile.readline()
                while len(s) != 0 and not self.__is_terminate__(s):
                    if s.split(' ') != []:
                        l_r = r'(\ )*\-(\ )*(?P<value>.+)'
                        m = re.match(l_r, s)
                        ret = m.group('value')
                        tmp.append(ret.lstrip(' ').rstrip(' '))
                    lst = infile.tell()
                    s = infile.readline()
                infile.seek(lst)
                return {self.name : tmp}

        class Images(Content):
            def __init__(self, name, gen_pattern, terminating_patterns, np_res):
                Content.__init__(self, name, gen_pattern, terminating_patterns)
                self.__np_res = np_res

            def process(self, infile):
                tmp = []
                lst = infile.tell()
                s = infile.readline()
                while len(s) != 0 and not self.__is_terminate__(s):
                    if s.split(' ') != []:
                        img_p = r'(\ )*(?P<name>(\w|[!?,()\-\:\.\ ])+)?(\ )*\|(\ )*(?P<filename>(\w|[!?,\-\:\_\.])+)'
                        m = re.match(img_p, s)

                        if (m != None):
                            img_name, img_filename = (m.group('name'), m.group('filename'))

                            img_name = '' if img_name == None else img_name.lstrip(' ').rstrip(' ')

                            if img_filename == None:
                                raise Exception('Wrong image file name: {0}'.format(s))
                            else:
                                img_filename.lstrip(' ').rstrip(' ')

                            if not (img_filename.startswith('http') or img_filename.startswith('https')):
                                if (not img_filename in self.__np_res):
                                    self.__np_res += [img_filename]
                                else:
                                    print("Warning: file duplicate: {0}".format(img_filename))
                                img_filename = os.path.join("posts", str(new_id), img_filename)

                            tmp.append({"name" : img_name, "file" : img_filename})
                        else:
                            raise Exception('Wrong img tag format: {0}'.format(s))
                    lst = infile.tell()
                    s = infile.readline()
                infile.seek(lst)
                return {self.name : tmp}

        class Raw(Content):
            def __init__(self, name, gen_pattern, terminating_patterns, np_res):
                Content.__init__(self, name, gen_pattern, terminating_patterns)
                self.__np_res = np_res

            def process(self, infile):
                tmp = [] 
                filename_pattern = r'((\w|[,\-\_\.])+)'

                lst = infile.tell()
                s = infile.readline()
                while len(s) != 0 and not self.__is_terminate__(s):
                    if s.split(' ') != []:
                        mt = re.findall(filename_pattern, s)
                        for q in mt:
                            if q == "post.txt":
                                raise Exception('Conflict with reserved filename: post.txt')
                            else:
                                tmp.append(str(q[0]))
                    lst = infile.tell()
                    s = infile.readline()
                infile.seek(lst)
                
                # adding files to move query
                index_fname = ''
                for q in tmp:
                    if q.endswith('.html') or q.endswith('.htm'):
                        if index_fname == '':
                            index_fname = os.path.join("posts", str(new_id), q)
                        elif index_fname != os.path.join("posts", str(new_id), q):
                            raise Exception('Only one html or htm file is allowed.')
                    if (not q in self.__np_res):
                        self.__np_res += [q]
                    else:
                        print("Warning: file duplicate: {0}".format(q))

                if index_fname == '':
                    raise Exception('Missing ".html" or ".htm" file!')
                return {self.name : tmp}

        def is_content(s):
            return reduce(lambda x, y: x or y.check(s), contents, False)

        terminating_patterns = [r'-----------',
                                r'@p(-)*', 
                                r'@code(-)*',
                                r'@list(-)*',
                                r'@img(-)*',
                                r'@raw(-)*']

        contents = [ Paragraph('p',    r'@p(-)*',    terminating_patterns),
                          Code('code', r'@code(-)*', terminating_patterns),
                          List('list', r'@list(-)*', terminating_patterns),
                        Images('img',  r'@img(-)*',  terminating_patterns, np_res), 
                           Raw('raw',  r'@raw(-)*',  terminating_patterns, np_res)]
        content = []

        # content
        s = infile.readline()
        while len(s) != 0:
            block = next((q for q in contents if q.check(s)), None)
            if block != None:
                content.append(block.process(infile))
            s = infile.readline()

        return content

    np_res      = []
    header      = parse_header(infile, np_res)
    contents    = parse_contents(infile, np_res, new_id)

    return (dict(list({'header' : header}.items()) + list({'content' : contents}.items())), np_res)
