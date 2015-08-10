const Lint = require('./lint').Lint;
const eslint = require('eslint').linter;

class ESLint extends Lint {

    constructor(filename, config, ignore) {
        super(filename, config, ignore);
    }

    lint() {
        if (!this.beforeLint()) { return; }
        let messages = eslint.verify(this.filedata, this.config);
        let errorLen = 0;
        messages = messages.map(function (message) {
            let warn = !message.fatal && message.severity === 1;
            if (!warn) { errorLen += 1; }
            return {
                line: message.line || 0,
                col: message.column || 0,
                message: message.message.replace(/\.$/, ''),
                rule: {
                    id: message.ruleId
                },
                warn: warn
            };
        });
        this.reporter(messages);
        return errorLen;
    }

}

exports.Lint = ESLint;
