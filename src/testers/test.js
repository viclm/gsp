const events = require('events');
const gspdata = require('../util/gspdata');
const mustache = require('mustache');
const phantomjs = require('../util/phantom');

const RUNNER_TMPL = `
<!doctype html>
<html lang="zh">
    <head>
        <meta content="text/html; charset=utf-8" http-equiv="content-type" />
        {{#scripts}}
        <script src="{{&.}}"></script>
        {{/scripts}}
    </head>
    <body></body>
</html>
`;

class Test extends events.EventEmitter {

    constructor(specFiles, helperFiles) {
        super();
        this.specFiles = specFiles;
        this.helperFiles = helperFiles;
        this.engineFiles = [];

        this.specStats = {
            total: 0,
            passed: 0,
            failed: 0,
            pending: 0
        };
    }

    generateRunner() {
        let scripts = [];
        scripts = scripts.concat(this.engineFiles, [this.reporter()], this.helperFiles, this.specFiles);
        let html = mustache.render(RUNNER_TMPL, {
            scripts: scripts
        });
        return gspdata.file('specRunner.html', html);
    }

    run() {
        let runner = this.generateRunner();
        phantomjs.spawn(runner);
        phantomjs.on('spec.start', this.onSpecStart.bind(this));
        phantomjs.on('spec.done', this.onSpecDone.bind(this));
        phantomjs.on('spec.finish', this.onSpecFinish.bind(this));
        phantomjs.on('error', function (message, stack) {
            console.log(stack);
        });
    }

    reporter() {
    }

    onSpecStart() {
        this.specStats.total += 1;
    }

    onSpecDone() {
    }

    onSpecFinish() {
        phantomjs.halt();
        gspdata.file('specRunner.html', null);
        gspdata.file('reporter.js', null)
        this.emit('finish', this.specStats);
    }

}

exports.Test = Test;
