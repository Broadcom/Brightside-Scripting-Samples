var gulp = require('gulp-help')(require('gulp'));
var gulpSequence = require('gulp-sequence');
var PluginError = require('plugin-error');
var cmd = require('node-cmd');
var config = require('./config.json');

/**
 * await Job Callback - Callback is made without error if Job completes with CC < MaxRC in the allotted time
 * @callback awaitJobCallback
 * @param {Error} err 
 */

 /**
 * await SSMState Callback - Callback is made without error if desired state is reached within the the allotted time
 * @callback awaitSSMStateCallback
 * @param {Error} err 
 */

/**
* Polls jobId. Callback is made without error if Job completes with CC < MaxRC in the allotted time
* @param {string}           jobId     jobId to check the completion of
* @param {number}           [maxRC=0] maximum allowable return code
* @param {awaitJobCallback} callback  function to call after completion
* @param {number}           tries     max attempts to check the completion of the job
* @param {number}           wait      wait time in ms between each check
*/
function awaitJobCompletion(jobId, maxRC=0, callback, tries = 30, wait = 1000) {
  if (tries > 0) {
    sleep(wait);
    cmd.get(
    'bright jobs view job-status-by-jobid ' + jobId + ' --rff retcode --rft string',
    function (err, data, stderr) {
      if(err){
        callback(err);
      } else if (stderr){
        callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
      } else {
        retcode = data.trim();
        //retcode should either be null of in the form CC nnnn where nnnn is the return code
        if (retcode == "null") {
          awaitJobCompletion(jobId, maxRC, callback, tries - 1, wait);
        } else if (retcode.split(" ")[1] <= maxRC) {
          callback(null);
        } else {
          callback(new Error(jobId + " had a return code of " + retcode + " exceeding maximum allowable return code of " + maxRC));
        }
      }
    });
  } else {
    callback(new Error(jobId + " timed out."));
  }
}

/**
* Polls state of SSM managed resource. Callback is made without error if desired state is reached within the the allotted time
* @param {string}                 resource      SSM managed resource to check the state of
* @param {string}                 desiredState  desired state of resource
* @param {awaitSSMStateCallback}  callback      function to call after completion
* @param {number}                 tries         max attempts to check the completion of the job
* @param {number}                 wait          wait time in ms between each check
*/
function awaitSSMState(resource, desiredState, callback, tries = 30, wait = 1000) {
  if (tries > 0) {
    sleep(wait);
    cmd.get(
    'bright ops show resource ' + resource,
    function (err, data, stderr) {
      if(err){
        callback(err);
      } else if (stderr){
        callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
      } else {
        //First find the header
        var pattern = new RegExp("current:.*");
        var currentState = data.match(pattern)[0].split(' ')[1];

        //check if currentState is the desiredState
        if (currentState != desiredState) {
          awaitSSMState(resource, desiredState, callback, tries - 1, wait);
        } else { //currentState does equal desiredState so success!
          callback(null);
        }
      }
    });
  } else {
      callback(new Error(resource + " did not reached desired state of " + desiredState + " in the allotted time."));
  }
}

/**
* Runs command and calls back without error if successful
* @param {string}           command   command to run
* @param {awaitJobCallback} callback  function to call after completion
*/
function simpleCommand(command, callback){
  cmd.get(command, function(err, data, stderr) { 
    if(err){
      callback(err);
    } else if (stderr){
      callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
    } else {
      callback();
    }
  });
}

/**
 * Sleep function.
 * @param {number} ms Number of ms to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
* Changes state of SSM managed resource. Callback is made without error if desired state is reached within the the allotted time
* @param {string}                 resource      SSM managed resource to change the state of
* @param {string}                 state         desired state of resource
* @param {awaitSSMStateCallback}  callback      function to call after completion
* @param {string}                 [apf]          data set to APF authorize if required
*/
function changeResourceState(resource, state, callback, apf) {
  var command;
  if(state === "UP") {
    command = 'bright ops start resource ' + resource;
  } else if(state === "DOWN") {
    command = 'bright ops stop resource ' + resource;
  } else{
    callback(new Error("\nUnrecognized desired state of: " + state + ". Expected UP or DOWN."));
  }
  
  
  // Submit job, await completion
  cmd.get(command, function (err, data, stderr) {
    if(err){
      callback(err);
    } else if (stderr){
      callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
    } else {
      // Await the SSM Resource Status to be up
      awaitSSMState(resource, state, function(err){
        if(err){
          callback(err);
        } else if(typeof apf !== 'undefined'){
          // Resource state successfully changed and needs APF authorized
          command = 'bright zos-console issue command "SETPROG APF,ADD,DSNAME=' + apf + ',SMS"';
          simpleCommand(command, callback);
        } else { //Resource state is changed, does not need APF authorized
          callback();
        }
      });
    }
  });
}

/**
* Submits job and verifies successful completion
* @param {string}           ds        data-set to submit
* @param {number}           [maxRC=0] maximum allowable return code
* @param {awaitJobCallback} callback  function to call after completion
*/
function submitJob(ds, maxRC=0, callback){
  var command = 'bright jobs submit data-set "' + ds + '" --rff jobid --rft string'
  cmd.get(command, function(err, data, stderr) { 
    if(err){
      callback(err);
    } else if (stderr){
      callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
    } else {
      // Strip unwanted whitespace/newline
      var jobId = data.trim();
      
      // Await the jobs completion
      awaitJobCompletion(jobId, maxRC, function(err){
        if(err){
          callback(err);
        } else{
          callback();
        }
      });
    }
   });
}

gulp.task('apply', 'Apply Maintenance', function (callback) {
  var ds = config.remoteJclPds + '(' + config.applyMember + ')';
  submitJob(ds, 0, callback);
});

gulp.task('apply-check', 'Apply Check Maintenance', function (callback) {
  var ds = config.remoteJclPds + '(' + config.applyCheckMember + ')';
  submitJob(ds, 0, callback);
});

gulp.task('copy', 'Copy Maintenance to Runtime', function (callback) {
  var command = 'bright file-master-plus copy data-set "' + config.smpeEnv + '.' + config.maintainedPds + '" "' + config.runtimeEnv + '.' + config.maintainedPds + '"';
  simpleCommand(command, callback);
});

gulp.task('receive', 'Receive Maintenance', function (callback) {
  var ds = config.remoteJclPds + '(' + config.receiveMember + ')';
  submitJob(ds, 0, callback);
});

gulp.task('reject', 'Reject Maintenance', function (callback) {
  var ds = config.remoteJclPds + '(' + config.rejectMember + ')';
  submitJob(ds, 0, callback);
});

gulp.task('restore', 'Restore Maintenance', function (callback) {
  var ds = config.remoteJclPds + '(' + config.restoreMember + ')';
  submitJob(ds, 0, callback);
});

gulp.task('start1', 'Start SSM managed resource1', function (callback) {
  var apf = config.runtimeEnv + '.' + config.maintainedPds;
  changeResourceState(config.ssmResource1, "UP", callback);
});

gulp.task('start2', 'Start SSM managed resource2', function (callback) {
  // var apf = config.runtimeEnv + '.' + config.maintainedPds;
  changeResourceState(config.ssmResource2, "UP", callback);
});

gulp.task('stop1', 'Stop SSM managed resource1', function (callback) {
  changeResourceState(config.ssmResource1, "DOWN", callback);
});

gulp.task('stop2', 'Stop SSM managed resource2', function (callback) {
  changeResourceState(config.ssmResource2, "DOWN", callback);
});

gulp.task('upload', 'Upload Maintenance to USS', function (callback) {
  var command = 'bright files upload ftu "' + config.localFolder + '/' + config.localFile + '" "' + config.remoteFolder + '/' + config.remoteFile + '" -b';
  simpleCommand(command, callback);
});

gulp.task('deploy', 'Deploy Maintenance', gulpSequence('upload','receive','apply-check','apply','stop','copy','start'));
gulp.task('reset', 'Reset Maintenance', gulpSequence('reject','restore','stop','copy','start'));
gulp.task('start', 'Start SSM managed resources', gulpSequence('start1','start2'));
gulp.task('stop', 'Stop SSM managed resources', gulpSequence('stop2', 'stop1'));