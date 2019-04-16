#!/bin/bash
# Script the pushes an element from EXT/ELEMENT.EXT
# Input: Element name ($1), Type ($2) 
set -ex

cat JCL/push.jcl | sed -r 's/\{\{ELEMENT\}\}/'"$1"'/g' > JCL/temp.jcl

function awaitJobCompletion () {
    jobid=$1
    maxRC=$2
    tries=20
    wait=2

    retcode=`bright jobs view job-status-by-jobid $jobid --rff retcode --rft string`
    
    counter=0
    while (("$counter" < $tries)) && [ "$retcode" == "null" ]; do
        counter=$((counter + 1))
        sleep $wait
        
        retcode=`bright jobs view job-status-by-jobid $jobid --rff retcode --rft string`
    done

    if [ "$retcode" == "null" ]; then
       echo $ds 'timed out'
       exit 1
    elif [ $(($(echo $retcode | awk '{print $2}'))) -gt $maxRC ]; then
       echo $ds 'completed with return code' $retcode 'which is greater than maxRC' $maxRC
       exit 1
    else
       echo 'Success'
    fi
}

bright files upload ftds "$2/$1.$2" "PUBLIC.TESTING.PDSIN($1)"

jobid=`bright jobs submit lf "JCL/temp.jcl" --rff jobid --rft string`

awaitJobCompletion $jobid "0"
