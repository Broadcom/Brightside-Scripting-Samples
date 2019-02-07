#!/usr/bin/env bash
# Set the shell to exit immediately if a command exits with a nonzero exit value
# Set the shell to display script input/output
set -ex

# ENDEVOR is an option ENV variable to enable execution in profile-less enviornment. 
# If profiles are in use, no ENV variable needs set
bright endevor generate element MARBLE15 --type COBOL --override-signout --maxrc 0 $ENDEVOR
bright endevor generate element MARBLE15 --type LNK --override-signout --maxrc 0 $ENDEVOR