/*global phantom:true*/

const fs = require('fs');

let url = phantom.args[0];
let msgFile = phantom.args[1];
let options = JSON.parse(phantom.args[2] || '{}');

if (!options.timeout) { options.timeout = 5000; }

let last = Date.now();

let sendMessage = function(type) {
    let msg = type === 'alert' ? arguments[1] : JSON.stringify(Array.prototype.slice.call(arguments));
    fs.write(msgFile, msg + '\n', 'a');
    last = Date.now();
};

let page = require('webpage').create();

// Abort if the page doesn't send any messages for a while.
setInterval(function() {
    if (Date.now() - last > options.timeout) {
        sendMessage('timeout');
        phantom.exit();
    }
}, 100);

page.onConsoleMessage = function() {
    sendMessage.apply(this, arguments);
};

page.onAlert = function (msg) {
    sendMessage('alert', msg);
};

page.onResourceError = function (resourceError) {
    sendMessage('error', resourceError.url);
};

page.onError = function(msg, trace) {
    var track = [msg];
    if (trace && trace.length) {
        trace.forEach(function(t) {
            if (t.function) {
                track.push('    at ' + t.function + ' (' + t.file + ':' + t.line + ')');
            }
            else {
                track.push('    at ' + t.file + ':' + t.line);
            }
        });
    }
    sendMessage('error', msg, track.join('\n'));
};

page.onLoadFinished = function(status) {
    if (status === 'success') {
        sendMessage('success');
    }
    else {
        sendMessage('failure');
        phantom.exit();
    }
};

page.open(url);
