/* eslint no-eq-null:0 */
const fs = require('fs-extra');
const path = require('path');
const pkg = require('../../package.json');

let homedir = (process.platform === 'win32') ? path.join(process.env.LOCALAPPDATA, pkg.name) : path.join(process.env.HOME, '.' + pkg.name);

exports.get = function (type, key) {
    let filename = path.join(homedir, type) + '.json', filedata;
    if (fs.existsSync(filename)) {
        filedata = fs.readJSONSync(filename, {throws: false}) || {};
    }
    else {
        filedata = {};
    }
    return key ? filedata[key] : filedata;
};

exports.set = function (type, key, value) {
    if (!key) {
        return;
    }
    let filename = path.join(homedir, type) + '.json';
    let filedata = exports.get(type);
    if (typeof key === 'object') {
        filedata = key;
    }
    else if (value == null) {
        delete filedata[key];
    }
    else {
        filedata[key] = value;
    }
    fs.outputJSONSync(filename, filedata, {spaces: 2});
};

exports.file = function (name, content) {
    let filename = path.join(homedir, 'tmp', name);
    if (content === undefined) {
        return fs.existsSync(filename) ? fs.readFileSync(filename, {encoding: 'utf8'}) : '';
    }
    else if (content == null) {
        fs.unlinkSync(filename);
    }
    else {
        fs.outputFileSync(filename, content);
        return filename;
    }
};
