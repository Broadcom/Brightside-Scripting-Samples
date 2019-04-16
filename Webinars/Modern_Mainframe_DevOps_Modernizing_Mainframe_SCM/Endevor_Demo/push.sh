#!/bin/bash
# Script pushes all local elements to Endevor sandbox
set -e
IFS=$'\n'

# Create logs folder to keep endevor reports
mkdir -p "logs"
cd logs

# Retrieve list of elements (in alphabetical order to show what is happening)
arrEle=( $(find ../*/ -type f -not -path "../logs/*" -printf '%h\0%d\0%p\n' | sort -t '\0' -n | awk -F'\0' '{print $3}') )

# For each element in list, push contents
for i in ${arrEle[@]} ; do 
    IFS=$'/'
    read -a arrAttr <<< "$i"
    TYPE=${arrAttr[1]}
    STAGE=${arrAttr[2]}
    NAME=`echo ${arrAttr[3]} | cut -f1 -d"."`
    EXT=`echo ${arrAttr[3]} | cut -f2 -d"."`

    bright endevor update ele $NAME --typ $TYPE --ff "../"$TYPE"/"$STAGE"/"$NAME"."$EXT --os --maxrc 12
done
