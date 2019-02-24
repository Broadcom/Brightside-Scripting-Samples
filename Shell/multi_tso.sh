#!/bin/sh 

# Shell script to run multiple TSO commands in one address space 
# with the default zosmf profile in zowe CLI

set -ex

# these functions could be moved into a shared file and loaded using the 
# source command, or added to .bashrc/ .profile and automatically made available
# on login

# start a TSO address space and set SERVLET_KEY to the new servlet key
# call end_tso() to stop the address space
start_tso(){
    SERVLET_KEY=`zowe tso start as | grep -oP "(?<=: ).*"`
}

# send a message to the TSO address space that is started 
send_tso(){
    zowe tso send as "$SERVLET_KEY" --data "$1"
}

# end a TSO address space whose servlet key is stored in SERVLET_KEY
stop_tso(){
    zowe tso stop as "$SERVLET_KEY"
}

echo "Please enter the Top Secret USER ID:"
read TSSUSER # read TSSUSER variable from the user

start_tso
#---------------------------------------------------------
send_tso "TIME"
send_tso "TSS LIST($TSSUSER) DATA(ALL) SEGMENT(ALL)"
#---------------------------------------------------------
stop_tso