const chalk = require('chalk');
const sass = require('node-sass');
const path = require('path');

let rsass = /\.(?:sass|scss)$/;

let compilesass = function (workdir, filename, filedata, callback) {
    sass.render({
        file: path.join(workdir, filename)
    }, function (err, data) {
        if (err) {
            let column = err.column;
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
            errMsg = '[sass]:' + line + ':' + column + ': ' + err.message;
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
    compilesass(file.get('workdir'), file.get('filename'), file.get('filedata'), function (err, filedata) {
        if (!err) {
            file.set('filename', file.get('filename').replace(rsass, '.css'));
            file.set('filedata', filedata);
        }
        callback(err);
    });
};
