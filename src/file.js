const async = require('async');
const gspdata = require('./util/gspdata');
const fs = require('fs-extra');
const glob = require('glob');
const isBinaryPath = require('is-binary-path');
const path = require('path');

let $fileCache = {};

class File {

    constructor(workdir, filename, config) {
        if (filename) {
            filename = filename.split(path.sep).join('/');
        }
        this.workdir = workdir;
        this.filename = filename;
        this.config = config;
        this.filedata = null;
    }

    get(key) {
        return this[key];
    }

    set(key, value) {
        if (key === 'filename' && value) {
            value = value.split(path.sep).join('/');
        }
        this[key] = value;
    }

    read(callback) {
        let filename = path.join(this.workdir, this.filename);
        if (fs.existsSync(filename)) {
            let mtime = fs.statSync(filename).mtime.getTime();
            let whiteExts = ['.sass','.scss','.less','.styl'];
            let ext = path.extname(filename);
            if ($fileCache[filename] && whiteExts.indexOf(ext) === -1) {
                if ($fileCache[filename].mtime === mtime) {
                    callback(null, $fileCache[filename].content);
                    return;
                }
                else {
                    $fileCache[filename] = null;
                }
            }
            let filedata = fs.readFileSync(filename);
            if (isBinaryPath(filename)) {
                this.filedata = filedata;
                $fileCache[filename] = {
                    content: filedata,
                    mtime: mtime
                };
                callback(null, filedata);
                return;
            }
            this.filedata = filedata.toString();
            this.preprocess((err) => {
                if (!err) {
                    $fileCache[filename] = {
                        content: this.filedata,
                        mtime: mtime
                    };
                }
                callback(err, this.filedata);
            });
        }
        else {
            if ($fileCache[filename]) {
                $fileCache[filename] = null;
            }
            callback(new Error(filename + ' doesn\'t exist'));
        }
    }

    preprocess(callback) {
        let preprocessorConfig = this.config.preprocessors;
        async.eachSeries(Object.keys(preprocessorConfig), (extname, callback) => {
            if (path.extname(this.get('filename')).slice(1) === extname) {
                async.eachSeries(preprocessorConfig[extname], (preprocessor, callback) => {
                    let mod;
                    try {
                        mod = require(`./preprocessors/${preprocessor}`);
                    }
                    catch (e) {
                        callback();
                        return;
                    }
                    mod(this, callback);
                }, callback);
            }
            else {
                callback();
            }
        }, callback);
    }

}

File.$inject = ['workdir', 'filename', 'config'];

class Concat extends File {

    constructor() {
        super();
        this.concatconfig = null;
    }

    read(callback) {
        if (isBinaryPath(this.filename)) {
            super.read(callback);
        }
        else {
            this.getconcatconfig((err, concatconfig) => {
                if (err) {
                    callback(err);
                }
                else {
                    this.concatconfig = concatconfig;
                    this.concatFiles(this.filename, callback);
                }
            });
        }
    }

    getconcatconfig(callback) {
        let file = new File(this.workdir, 'concatfile.json', this.config);
        file.read((err, filedata) => {
            if (err) {
                callback(null, {});
            }
            else {
                try {
                    filedata = JSON.parse(filedata);
                }
                catch (e) {
                    callback(new Error('concatfile.json isn\'t a valid JSON file.'));
                    return;
                }
                callback(null, filedata);
            }
        });
    }

    concatFiles(filename, callback) {

        let flattenFiles = [];

        if (!this.concatconfig.pkg[filename]) {
            this.concatconfig.pkg[filename] = [filename.replace(path.extname(filename), '.*')];
        }
        else if (typeof this.concatconfig.pkg[filename] === 'string') {
            this.concatconfig.pkg[filename] = [this.concatconfig.pkg[filename]];
        }

        async.eachSeries(this.concatconfig.pkg[filename], (file, c) => {
            let ignore = false;
            if (file.indexOf('!') === 0) {
                file = file.slice(1);
                ignore = true;
            }
            this.flattenFiles(file, (err, files) => {
                for (let f of files) {
                    let index = flattenFiles.indexOf(f);
                    if (index === -1) {
                        if (!ignore) {
                            flattenFiles.push(f);
                        }
                    }
                    else {
                        if (ignore) {
                            flattenFiles.splice(index, 1);
                        }
                    }
                }
                c();
            });
        }, () => {

            async.mapSeries(flattenFiles, (file, c) => {
                let ext = this.concatconfig.ext && this.concatconfig.ext[file];
                if (ext) {
                    if (gspdata.get('repositories', ext.repo)) {
                        this.getExternalFile(gspdata.get('repositories', ext.repo), ext.uri, c);
                    }
                    else {
                        c(new Error('Repository ' + ext.repo + ' doesn\'t exits'));
                    }
                }
                else if (this.concatconfig.pkg[file] && file !== filename) {
                    this.concatFiles(file, c);
                }
                else {
                    file = new File(this.workdir, file, this.config);
                    file.read((err, filedata) => {
                        if (!err) {
                            filedata = `/* from ${path.join(file.get('workdir'), file.get('filename'))} */\n` + filedata;
                            let orignalFilename = this.get('filename');
                            this.set('filename', orignalFilename.slice(0, -path.extname(orignalFilename).length) + path.extname(file.get('filename')));
                        }
                        c(err, filedata);
                    });
                }
            }, (err, result) => {
                callback(err, result.join('\n'));
            });

        });
    }

    flattenFiles(filename, callback) {
        if (filename.indexOf('*') === -1) {
            callback(null, [filename]);
            return;
        }
        callback(null, glob.sync(filename, {cwd: this.workdir}));
    }

    getExternalFile(repoPath, filename, callback) {
        let config = fs.readJSONSync(path.join(repoPath, '.gspconfig'), {throws: false}) || {};
        let file = new Concat();
        file.set('workdir', repoPath);
        file.set('filename', filename);
        file.set('config', config);
        file.read(callback);
    }
}

Concat.$inject = [];

exports.File = File;
exports.Concat = Concat;
