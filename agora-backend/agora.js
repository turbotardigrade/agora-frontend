/**
 * @module Agora backend management
 * @description This module manages the Agora process, as well as
 *              sends/receives requests.
 */

'use strict';

const child_process = require('child_process');
const process = require('process');
const stream = require('stream');
const readline = require('readline');
const path = require('path');

// change path so that commands are always relative to the this file's directory
process.chdir(__dirname);
let agora_process = child_process.spawn('../peerbackend/peerbackend', ['--silent']);

// readline interface for easy input/output using question and answer
let rl = readline.createInterface({
  input: agora_process.stdout,
  output: agora_process.stdin
});

// cleanup procedures start
// nodeEnd is the function called when the node instance receives an exit signal
// it needs to be re-set every time the agora process refreshes if killed
function nodeEnd() {
  // signal all current processing requests that a terminate request has been received
  isTerminating = true;
  // if it is processing, ensure all events return before stopping
  if (processing) {
    (function wait() {
      if (processing) {
        setTimeout(wait, 100);
      } else {
        agora_process.kill();
      }
    })()
  } else {
    agora_process.kill();
  }
}
process.on('exit', nodeEnd);
agora_process.on('exit', agoraCleanup);
function agoraCleanup() {
  console.log("Peerbackend: Program terminated");
  if (!isTerminating) {
    agora_process = child_process.spawn('../peerbackend/peerbackend', ['--silent']);
    rl = readline.createInterface({
      input: agora_process.stdout,
      output: agora_process.stdin
    })
    agora_process.removeListener('exit', agoraCleanup);
    process.removeListener('exit', nodeEnd);
    agora_process.on('exit', agoraCleanup);
    process.on('exit', nodeEnd);
  }
}
// cleanup procedures end

const requests = [];

// stores whether there is a function chain processing right now
var processing = false;
// if program has received a terminate signal
var isTerminating = false;

// the chained parameter means that this function call is chained
// from a previous request,
function processNextRequest(chained) {
  // two conditions where the next request should not be processed
  // 1. processing is true (a function chain is currently processing) and
  //    chained is false (this function is not part of the current
  //    processing function chain)
  // 2. requests.length is false (no requests are left to process)
  if ((processing && !chained) || !requests.length) {
    // if there are no requests left to process, but we are part of the current
    // processing function chain, we are done processing.
    if (chained) {
      processing = false;
    }
    return;
  }
  processing = true;
  var request = requests.shift();
  var question = JSON.stringify({
    command: request.command,
    arguments: request.arguments
  }) + '\n';
  try {
    rl.question(question, (response) => {
      var res;
      try {
        res = JSON.parse(response)
      } catch (err) {
        res = { error: 'An error has occurred with the Agora backend.' }
        console.log(response);
      }
      request.callback(res);
      if (requests.length > 0) {
        // if there are requests remaining
        // keep the current processing chain going
        process.nextTick(function() {
          processNextRequest(true)
        });
      } else {
        // else terminate the processing
        processing = false;
      }
    })
  } catch (e) {
    requests.unshift(request);
    processing = false;
    // try again if it fails after 200 ms
    setTimeout(processNextRequest, 200);
  }
}

module.exports = {
  request: function addRequest(commandObj, callback) {
    // do not process any more requests if program is terminating
    if (isTerminating) {
      callback({
        error: 'Process is terminating'
      });
      return;
    }
    requests.push({
      command: commandObj.command,
      arguments: commandObj.arguments,
      callback
    });
    processNextRequest();
  },
  quit: nodeEnd
};
