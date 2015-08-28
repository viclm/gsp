const chalk = require('chalk');
const fs = require('fs-extra');
const glob = require('../util/glob');
const textable = require('text-table');

class Lint {

    constructor(filename, config, ignore) {
        this.filename = filename;
        this.config = config;
        this.ignore = ignore;
    }

    lint() {
        if (this.beforeLint()) {
            this.reporter([]);
            return 0;
        }
    }

    beforeLint() {
        if (this.ignore && glob.match(this.filename, this.ignore)) {
            return false;
        }
        this.filedata = fs.readFileSync(this.filename, {encoding: 'utf8'});
        if (typeof this.config === 'string') {
            this.config = fs.readJSONSync(this.config, {throws: false}) || {};
        }
        return true;
    }

    reporter(messages) {
        if (!messages.length) {
            return;
        }
        let output = messages.map(function (message) {
            let out = [];
            out.push(message.line);
            out.push(message.col);
            out.push(message.warn ? chalk.yellow('warning') : chalk.red('error'));
            out.push(message.message.slice(0, -1));
            out.push(chalk.grey(message.rule.id));
            return out;
        });
        output = textable(output, {align: ['r', 'l']});
        output = output.split('\n').map(function(el) {
            return el.replace(/(\d+)\s+(\d+)/, function(m, p1, p2) {
                return chalk.grey(p1 + ':' + p2);
            });
        }).join('\n');
        console.log('\n' + this.filename + '\n');
        console.log(output);
        console.log(chalk.red.bold('\n\u2716 ' + messages.length + ' problems'));
    }

}

exports.Lint = Lint;
