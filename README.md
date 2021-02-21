## Mini Blog

Just a mini-blog with basic functionality.
Once I wanted to practise python and javascript, so I created this small-static blog generator.
You can use it, but it was created as an experiment and it will not be maintaned.  
**Moreover, there are plenty of better solutions already. Have a look at:**
 * [Jekyll](https://github.com/jekyll/jekyll)
 * [Octopress](https://github.com/octopress/octopress)
 * [Hugo](https://github.com/spf13/hugo)

## How to use?

1. Create a post description file and move all necessary files into one folder
2. Run **python3 blog.py**
3. Commit and push updates

## Structure

General idea is that each post is described as
a sequence of "blocks" - basic structure units with specific purpose.

## Implemented blocks

name        | reg.expression   | description
------------|------------------|------------------
paragraph   | @p(-)\*          | lines will be merged into single paragraph. ignoring newline symbols
image slider| @img(-)\*        | lines in format **\<name\> &#124; \<filename\>** will be added to list of pictures
code        | @code(-)\*       | code will be automatically be recognized, using **highlight.js**
list        | @list(-)\*       | unordered list, each line starting with **-** (hypehen) will be considered as entry
raw         | @raw(-)\*        | iframe with source as listed html/html file. there should be only one html/htm file. all mentioned files will be moved/copied into the same directory with html/htm

Each regular expression is easily customizable in **postparser.py**

Requires: SASS, Python3

## Used open-source code:
 - [docopt](https://github.com/docopt/docopt)
 - [highlight.js](https://github.com/isagalaev/highlight.js)
