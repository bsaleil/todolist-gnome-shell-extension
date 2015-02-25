#! /bin/bash

for lang in ./*
do 
	if [ "$lang" != "./update.sh" ]
	then
		echo $lang/LC_MESSAGES/todolist.mo ;
		msgfmt $lang/LC_MESSAGES/$lang.po -o $lang/LC_MESSAGES/todolist.mo ;
	fi
done
