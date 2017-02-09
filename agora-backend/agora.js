/**
 * @module Agora backend management
 * @description This module manages the Agora process, as well as
 *              sends/receives requests.
 */

const child_process = require('child_process');
const stream = require('stream');
const readline = require('readline');

const agora_process = child_process.spawn('./agora/agora', ['--silent']);

// readline interface for easy input/output using question and answer
const rl = readline.createInterface({
  input: agora_process.stdout,
  output: agora_process.stdin
});

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
  rl.question(question, (response) => {
    request.callback(JSON.parse(response));
    if (requests.length > 0) {
      // if there are requests remaining
      // keep the current processing chain going
      processNextRequest(true);
    } else {
      // else terminate the processing
      processing = false;
    }
  })
}

module.exports = {
  request: function addRequest(command, arguments, callback) {
    // do not process any more requests if program is terminating
    if (isTerminating) {
      callback({
        error: 'Process is terminating'
      });
      return;
    }
    requests.push({
      command: command,
      arguments: arguments,
      callback: callback
    });
    processNextRequest();
  }
}

process.on('exit', function () {
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
    })
  } else {
    agora_process.kill();
  }
});
