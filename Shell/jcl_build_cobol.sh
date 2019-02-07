#!/usr/bin/env bash
# Set the shell to exit immediately if a command exits with a nonzero exit value
# Set the shell to display script input/output
set -ex

tries=20
wait=5
function submitJCL () {
    ds=$1

    jobid=`bright jobs submit data-set $ds --rff jobid --rft string`

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
    elif [ "$retcode" != "CC 0000" ]; then
       echo $ds 'did not complete with CC 0000'
       exit 1
    else
       echo 'Success'
    fi
}

submitJCL $BUILDJCL