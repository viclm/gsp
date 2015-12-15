const babel = require('babel-core');
const babelPreset = require('babel-preset-es2015');

const rjs = /\.js$/;
const res6comment = /^\/\/es(?:6|2015)\s*?[\r\n]/;

let compileJS = function (filename, filedata, callback) {
    if (!rjs.test(filename) || res6comment.test(filedata)) {
        let err = null;
        try {
            filedata = babel.transform(filedata, {
                presets: [babelPreset],
                comments: false
            }).code;
        }
        catch (e) {
            err = new Error('[es6]' + e.message + '\n' + e.codeFrame);
        }
        callback(err, filedata);
    }
    else {
        callback(null, filedata);
    }
};

module.exports = function (file, callback) {
    compileJS(file.get('filename'), file.get('filedata'), function (err, filedata) {
        if (!err) {
            file.set('filedata', filedata);
        }
        callback(err);
    });
};
