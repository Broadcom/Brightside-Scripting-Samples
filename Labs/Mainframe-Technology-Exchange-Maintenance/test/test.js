var assert = require('assert');
var cmd = require('node-cmd');
var config = require('../config.json');

/**
 * await Job Callback
 * @callback awaitJobCallback
 * @param {Error} err 
 */

/**
 * Await FixLevel Quantity Callback
 * @callback awaitFixLevelCallback
 * @param {Error}  err 
 * @param {number} fixLevel null if module is not found in table
 */

/**
* Polls jobId. Callback is made without error if Job completes with CC 0000 in the allotted time
* @param {string}           jobId     jobId to check the completion of
* @param {awaitJobCallback} callback  function to call after completion
* @param {number}           tries     max attempts to check the completion of the job
* @param {number}           wait      wait time in ms between each check
*/
function awaitJobCompletion(jobId, callback, tries = 30, wait = 1000) {
  if (tries > 0) {
      sleep(wait);
      cmd.get(
      'bright jobs view job-status-by-jobid ' + jobId + ' --rff retcode --rft string',
      function (err, data, stderr) {
          retcode = data.trim();
          if (retcode == "CC 0000") {
            callback(null);
          } else if (retcode == "null") {
            awaitJobCompletion(jobId, callback, tries - 1, wait);
          } else {
            callback(new Error(jobId + " had a return code of " + retcode));
          }
      }
      );
  } else {
      callback(new Error(jobId + " timed out."));
  }
}

/**
* Gets module fix level
* @param {string}                 module    module to get the fix level of
* @param {awaitFixLevelCallback}  callback  function to call after completion
*
*/
function getModuleFixLevel(module, callback) {
  // Submit job, await completion
  cmd.get(
    'bright jobs submit data-set "' + config.remoteJclPds + '(' + config.checkVersionMember + ')" --rff jobid --rft string',
    function (err, data, stderr) {
      if(err){
        callback(err);
      } else {
        // Strip unwanted whitespace/newline
        var jobId = data.trim();
        
        // Await the jobs completion
        awaitJobCompletion(jobId, function(err){
          if(err){
            callback(err);
          } else {
            cmd.get(
              'bright jobs view sfbi ' + jobId + ' ' + config.checkVersionSpoolId,
              function (err, data, stderr) {
                if(err){
                  callback(err);
                } else {
                  //First find the header
                  var pattern = new RegExp(".*Name.*FixLevel.*");
                  header = data.match(pattern);

                  //Then determine the location where the FixLevel column starts
                  var fixLevelLocation = header[0].indexOf("FixLevel");

                  //Next, find the maintained member of interest
                  pattern = new RegExp(".*____ " + module + ".*","g");
                  var found = data.match(pattern);

                  if(!found){
                    callback(err, null);
                  } else { //found
                    //found should look like ____ Name TTR Alias-Of IdName Release Bld FixLevel AsmDate AsmTM AsmUser Owner MacLv ProdName
                    //However, there may be empty entries in the row so we key off of fixLevelLocation and an ending space
                    var fixLevel = found[0].substring(fixLevelLocation).split(" ")[0];
                    callback(err, fixLevel);
                  }
                }
              }
            );
          }
        });
      }
    }
  );
}

/**
 * Sleep function.
 * @param {number} ms Number of ms to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Maintenance', function () {
  // Change timeout to 60s from the default of 2s
  this.timeout(60000);

  /**
   * Test Plan
   * Run MODID utility to verify module is appropriately updated
   */
  describe('Module Check', function () {

    it('should have maintenance applied', function (done) {
      // Get Fix Level for maintained member specified in config
      getModuleFixLevel(config.maintainedMember, function(err, fixLevel){
        if(err){
          throw err;
        }
        assert.equal(fixLevel, config.expectedFixLevel, "Fix Level is not as expected for " + config.maintainedMember);
        done();
      });
    });
  });
});
