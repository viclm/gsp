const Lint = require('./lint').Lint;
const csslint = require('csslint').CSSLint;

class CSSLint extends Lint {

    constructor(filename, config, ignore) {
        super(filename, config, ignore);
    }

    lint() {
        if (!this.beforeLint()) { return; }
        let messages = csslint.verify(this.filename, this.config).messages;
        let errorLen = 0;
        messages = messages.map(function (message) {
            let warn = message.type === "warning";
            if (!warn) { errorLen += 1; }
            return {
                line: message.line || 0,
                col: message.col || 0,
                message: message.message.replace(/\.$/, ''),
                rule: {
                    id: message.rule.id
                },
                warn: warn
            };
        });
        this.reporter(messages);
        return errorLen;
    }

}

exports.Lint = CSSLint;
