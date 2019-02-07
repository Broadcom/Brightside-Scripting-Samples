#!/bin/sh
# print all members not containing "GDI"
memlist=($(bright files list all-members hlq.cntl | grep -v "GDI"))
printf '%s\n' "${memlist[@]}"
