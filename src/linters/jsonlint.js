const chalk = require('chalk');
const fs = require('fs');
const Lint = require('./lint').Lint;
const jsonlint = require('jsonlint').parser;

class JSONLint extends Lint {

    constructor(filename, config, ignore) {
        super(filename, config, ignore);
    }

    lint() {
        if (!this.beforeLint()) { return; }
        try {
            jsonlint.parse(fs.readFileSync(this.filename, {encoding: 'utf8'}));
            return 0;
        }
        catch (e) {
            console.log('\n' + this.filename + '\n');
            console.log(e.message);
            console.log(chalk.red.bold('\n\u2716 1 problems'));
            return 1;
        }
    }

}

exports.Lint = JSONLint;
