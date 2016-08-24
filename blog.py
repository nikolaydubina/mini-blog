"""Blog Terminal Interface

All manipulations with posts should be done through this interface.

add     -   adds new post based on files from specified directory
remove  -   removes post with specified id
clean   -   removing all posts and respective files. setting initial state
list    -   show current posts

Usage:
    blog.py add <folder-name> [--post-files-policy=<post-files-policy>]
    blog.py remove <id>
    blog.py clean
    blog.py list
    blog.py (-h | --help)

Options:
    -h --help                        Show this screen
    --post-files-policy=[move|copy]  Dealing with post`s files. [default: copy]
"""
import json
import os
import docopt
import postparser
from shutil import copyfile, rmtree
from functools import reduce
from datetime import datetime, time, date

class Blog():
    # constants
    __initial_posts            = {'by_time' : [], 'by_locations' : {}, 'by_tags' : {}}
    __initial_headers          = {}
    __post_description_file    = 'post.txt'
    __posts_folder             = 'posts'
    __posts_file               = 'posts.json'
    __headers_file             = 'headers.json'
    __post_files_resolve       = copyfile

    # private state
    __store_query              = []
    __state_changed            = False

    # public state
    posts                      = None
    headers                    = None

    def __init__(self):
        self.posts = self.__initial_posts
        self.headers = self.__initial_headers

    def set_post_files_policy(self, policy):
        if policy == 'copy':
            self.__post_files_resolve = copyfile
        if policy == 'move':
            self.__post_files_resolve = os.rename

    #
    #   Load / Store methods
    #
    def __load(self):
        self.__state_changed = True
        if os.path.isfile(self.__posts_file):
            self.posts = json.load(open(self.__posts_file,'r'))
        else:
            return 'Posts descriptor file not found at : {0}'.format(self.__posts_file)
        if os.path.isfile(self.__headers_file):
            self.headers = json.load(open(self.__headers_file,'r'))
        else:
            return 'Headers descriptor file not found at : {0}'.format(self.__headers_file)
        return ''

    def tryload(self):
        self.__load()

    def load(self):
        error_msg = self.__load()
        if error_msg != '':
            raise Exception(error_msg)

    def __store(self):
        json.dump(self.posts, open(self.__posts_file,'w'), indent = 4)
        json.dump(self.headers, open(self.__headers_file,'w'), indent = 4)

        for q in self.__store_query:
            json.dump(q['post'], open(os.path.join(self.__posts_folder, str(q['id']) + ".json"), 'w'), indent = 4)

            if len(q['resources']) != 0:
                old_path = q['path']
                new_path = os.path.join(self.__posts_folder, str(q['id']))

                if (os.path.exists(new_path)):
                    rmtree(new_path)
                os.mkdir(new_path)

                for t in q['resources']:
                    self.__post_files_resolve(os.path.join(old_path, str(t)), os.path.join(new_path, str(t)))

        del self.__store_query[:]

    def trystore(self):
        if self.__state_changed:
            self.__store()

    def store(self):
        self.__store()

    #
    # Posts manipulation methods
    #
    def add(self, path):
        def safe_append(to, key, val):
            if key in to:
                to[key].append(val)
            else:
                to[key] = [val]

        def get_new_id():
            if len(self.posts["by_time"]) == 0:
                return 1
            else:
                return max(self.posts["by_time"]) + 1

        self.__state_changed = True
        new_id = get_new_id()

        new_post, np_res = postparser.parse_post(open(os.path.join(path, self.__post_description_file),'r', encoding='utf-8'), new_id)

        self.posts["by_time"].append(new_id)

        safe_append(self.posts['by_locations'], new_post['header']['location'], new_id)

        for q in new_post["header"]["tags"]:
            safe_append(self.posts['by_tags'], q, new_id)

        self.headers[new_id] = new_post['header']

        self.__store_query.append({'id' : new_id, 'post' : new_post, 'path' : path, 
            'resources' : np_res + [self.__post_description_file]})

    def __remove_post(self, post_id):
        post_file = os.path.join(self.__posts_folder, str(post_id) + '.json')
        if os.path.isfile(post_file):
            os.remove(post_file)
        post_dir = os.path.join(self.__posts_folder, str(post_id))
        if os.path.isdir(post_dir):
            rmtree(post_dir)

    def clean(self):
        for post_id in self.posts['by_time']:
            self.__remove_post(post_id)

        self.posts = self.__initial_posts.copy()
        self.headers = self.__initial_headers.copy()
        self.__store_query = []
        self.__state_changed = True

    def remove(self, post_id):
        post_id = int(post_id)
        self.posts['by_time'] = [q for q in self.posts['by_time'] if q != post_id]

        new_tags = {}
        for k,v in self.posts['by_tags'].items():
            new_tags[k] = [q for q in v if q != post_id]
            if len(new_tags[k]) == 0:
                new_tags.pop(k, None)
        self.posts['by_tags'] = new_tags

        new_locations = {}
        for k,v in self.posts['by_locations'].items():
            new_locations[k] = [q for q in v if q != post_id]
        self.posts['by_locations'] = new_locations

        self.headers.pop(str(post_id), None)

        self.__store_query = [q for q in self.__store_query if q['id'] != post_id]
        self.__remove_post(post_id)
        self.__state_changed = True

    #
    # Show infromation
    #
    def showlist(self):
        show_order = list(self.posts['by_time'])
        show_order.reverse()
        print("   Id |      {1:10}     -     {2}".format('Id', 'Date', 'Title'))
        print("------|------------------------------------")
        for q in show_order:
            post_id = q
            post_time = self.headers[str(q)]['date']
            post_title = self.headers[str(q)]['title']
            print("{0:5} |      {1:10}     -     {2}".format(post_id, post_time, post_title))

if __name__ == '__main__':
    args = docopt.docopt(__doc__)

    blog = Blog()
    blog.tryload()

    if args['add']:
        blog.set_post_files_policy(args['--post-files-policy'])
        blog.add(args['<folder-name>'])
    if args['remove']:
        blog.remove(args['<id>'])
    if args['list']:
        blog.showlist()
    if args['clean']:
        blog.clean()
    
    blog.trystore()
