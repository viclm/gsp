const chalk = require('chalk');
const less = require('less');

let rLess = /\.less$/;

let compileLess = function (filedata, callback) {
    if (/^@import\s/m.test(filedata)) {
        callback(new Error('less import directives are not supported'));
        return;
    }
    less.render(filedata, function (err, data) {
        if (err) {
            let column = err.column;
            let line = err.line - 1;
            let codeLine = filedata.split('\n')[line];
            let offendingCharacter;

            if (column < codeLine.length) {
                offendingCharacter = chalk.red(codeLine[column]);
            }
            else {
                offendingCharacter = '';
            }

            line += 1;
            console.log('[less]:' + line + ':' + column + ': e' + err.toString().slice(1));
            console.log(codeLine.substring(0, column) + offendingCharacter + codeLine.substring(column + 1));
            console.log(new Array(column + 1).join(' ') + chalk.red('^'));
            err = new Error('Less errors.');
            callback(err);
        }
        else {
            callback(null, data.css);
        }
    });
};

module.exports = function (file, callback) {
    compileLess(file.get('filedata'), function (err, filedata) {
        if (!err) {
            file.set('filename', file.get('filename').replace(rLess, '.css'));
            file.set('filedata', filedata);
        }
        callback(err);
    });
};
