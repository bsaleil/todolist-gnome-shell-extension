#! /bin/bash

for lang in ./* ; do msgfmt ./$lang/LC_MESSAGES/$lang.po -o ./$lang/LC_MESSAGES/todolist.mo ; done
