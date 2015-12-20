const chalk = require('chalk');
const less = require('less');
const path = require('path');

let rLess = /\.less$/;

let compileLess = function (workdir, filename, filedata, callback) {
    less.render(filedata, {
            paths: [path.dirname(path.join(workdir, filename))]
        },
        function (err, data) {
        if (err) {
            let column = err.column + 1;
            let line = err.line - 1;
            let codeLine = filedata.split('\n')[line];
            let offendingCharacter;
            let errMsg;

            if (column < codeLine.length) {
                offendingCharacter = chalk.red(codeLine[column - 1]);
            }
            else {
                offendingCharacter = '';
            }

            line += 1;
            errMsg = '[less]:' + line + ':' + column + ': ' + err.message;
            errMsg += '\n' + codeLine.substring(0, column - 1) + offendingCharacter + codeLine.substring(column);
            errMsg += '\n' + new Array(column).join(' ') + chalk.red('^');
            err = new Error(errMsg);
            callback(err);
        }
        else {
            callback(null, data.css);
        }
    });
};

module.exports = function (file, callback) {
    compileLess(file.get('workdir'), file.get('filename'), file.get('filedata'), function (err, filedata) {
        if (!err) {
            file.set('filename', file.get('filename').replace(rLess, '.css'));
            file.set('filedata', filedata);
        }
        callback(err);
    });
};
