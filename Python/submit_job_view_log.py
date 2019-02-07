import subprocess
import os
import json
import pipes


# set the extension for the brightside command depending on operating system
bright_extension = ""
if os.name == 'nt':
    bright_extension = ".cmd"
bright = "bright" + bright_extension


def issue_command(cmd):
    try:
        output_string = subprocess.check_output(cmd, shell=True)
        return output_string
    except Exception as e:
        print 'Error encountered while executing command'
        print (e)
        if hasattr(e, 'output'):
            print(e.output)
        exit(1)


print 'Submitting job...'

# issue a brightside command to submit a job
bright_output_str = issue_command(
    bright + ' jobs submit data-set "hlq.public.cntl(iefbr14)" --response-format-json')
bright_output = json.loads(bright_output_str)  # parse the json response

job = bright_output["data"]

print "Submitted job " + job["jobname"] + "("+job["jobid"]+")"

# get an output DD of our job 
print "JES2 Job log spool content:\n"
bright_output_str = issue_command(
    bright + " jobs view spool-file-by-id " + job["jobid"] + " 2" # 2 is JES2 Job log 
)
print bright_output_str