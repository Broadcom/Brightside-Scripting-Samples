#!/bin/bash
# Script pulls all elements from Endevor sandbox
set -e
IFS=$'\n'

# Create logs folder to keep endevor reports
mkdir -p "logs"
cd logs

# Retrieve list of elements
arrEle=( $(bright endevor list ele --sm) )

# For each element in list, retrieve contents
for i in ${arrEle[@]} ; do 
    IFS=$' '
    read -r -a arrAttr <<< "$i"
    NAME=${arrAttr[0]}
    TYPE=${arrAttr[1]}
    ENV=${arrAttr[2]}
    STAGE=${arrAttr[3]}

    mkdir -p "../"$TYPE
    mkdir -p "../"$TYPE"/"$STAGE
    bright endevor retrieve ele $NAME --stage-number $STAGE --type $TYPE --tf "../"$TYPE"/"$STAGE"/"$NAME"."$TYPE --nsign --maxrc 4
done
