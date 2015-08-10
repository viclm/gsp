const child_process = require('child_process');
const gspdata = require('./gspdata');
const path = require('path');
const events = require('events');
const phantomjs = require('phantomjs');

class Browser extends events.EventEmitter {

    constructor() {
        super();
        this.halted = false;
        this.logFile = 'phantomspawn.log';

        this.on('timeout', this.halt.bind(this));
        this.on('failure', this.halt.bind(this));
        this.on('error', this.halt.bind(this));
    }

    halt() {
        this.halted = true;
    }

    spawn(pageUrl, options) {
        this.halted = false;
        let msgFile = gspdata.file(this.logFile, '');
        let msgLinesRead = 0;
        let timerId;
        let phantomProcess;

        let cleanup = () => {
            clearTimeout(timerId);
            gspdata.file(this.logFile, null);
            if (phantomProcess.pid){
                phantomProcess.kill();
            }
        };

        (function loopy() {
            let logs = gspdata.file(this.logFile);
            for (let log of logs.split('\n').slice(msgLinesRead, -1)) {
                log = JSON.parse(log);
                this.emit(...log);
                msgLinesRead += 1;
                if (this.halted) {
                    break;
                }
            }
            if (this.halted) {
                cleanup();
            }
            else {
                timerId = setTimeout(loopy.bind(this), 100);
            }
        }.bind(this)());

        let args = [
            path.join(__dirname, 'phantom_script.js'),
            pageUrl,
            msgFile,
            JSON.stringify(options || {})
        ];

        phantomProcess = child_process.execFile(phantomjs.path, args, function(err) {
            if (err) {
                cleanup();
            }
        });
        phantomProcess.stdout.pipe(process.stdout);

        return phantomProcess;
    }

}


module.exports = new Browser();
