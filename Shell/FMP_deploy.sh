#!/usr/bin/env bash
# Set the shell to exit immediately if a command exits with a nonzero exit value
# Set the shell to display script input/output
set -ex

tries=20
wait=2
function submitJCL () {
    ds=$1
    maxRC=$2

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
    elif [ $(($(echo $retcode | awk '{print $2}'))) -gt $maxRC ]; then
       echo $ds 'completed with return code' $retcode 'which is greater than maxRC' $maxRC
       exit 1
    else
       echo 'Success'
    fi
}

#Copy data
bright file-master-plus copy data-set "PRODUCT.NDVR.MARBLES.MARBLES.D1.DBRMLIB" "EOSMB.MARBLES.DBRMLIB" -m MARBLE15
bright file-master-plus copy data-set "PRODUCT.NDVR.MARBLES.MARBLES.D1.LOADLIB" "CICS.TRAIN.MARBLES.LOADLIB" -m MARBLE15

#Submit bind and grant
submitJCL "CUST015.MARBLES.JCL(MARBIND)" "4"
bright cics refresh program "MARBLE15" $CICS