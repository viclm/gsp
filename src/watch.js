const chalk = require('chalk');
const chokidar = require('chokidar');
const di = require('di');
const fs = require('fs-extra');
const gspdata = require('./util/gspdata');
const glob = require('glob');
const minimatch = require('minimatch');
const path = require('path');
const tinylr = require('tiny-lr');
const lint = require('./lint');

let concatConfigs = {};

let parseConcatConfig = function (repoLocation) {
    let c = fs.readJSONSync(path.join(repoLocation, 'concatfile.json'), {throws: false}) || {};
    c.pkg = c.pkg || {};
    c.ext = c.ext || {};
    c.rfs = {};
    Object.keys(c.pkg).forEach(function (pkgPath) {
        let flattenFiles = [];
        if (!Array.isArray(c.pkg[pkgPath])) {
            c.pkg[pkgPath] = [c.pkg[pkgPath]];
        }
        c.pkg[pkgPath].forEach(function (filepath) {
            let ignore = false, index;
            if (filepath.indexOf('!') === 0) {
                filepath = filepath.slice(1);
                ignore = true;
            }
            if (filepath.indexOf('*') === -1) {
                index = flattenFiles.indexOf(filepath);
                if (index === -1) {
                    if (!ignore) {
                        flattenFiles.push(filepath);
                    }
                }
                else {
                    if (ignore) {
                        flattenFiles.splice(index, 1);
                    }
                }
            }
            else {
                glob.sync(filepath, {cwd: repoLocation}).forEach(function (filepath) {
                    index = flattenFiles.indexOf(filepath);
                    if (index === -1) {
                        if (!ignore) {
                            flattenFiles.push(filepath);
                        }
                    }
                    else {
                        if (ignore) {
                            flattenFiles.splice(index, 1);
                        }
                    }
                });
            }
        });
        c.pkg[pkgPath] = flattenFiles;
    });
    Object.keys(c.pkg).forEach(function (pkgPath, index, pkgArray) {
        let rfs = [];
        pkgArray.slice(0, index).concat(pkgArray.slice(index)).forEach(function (pkgPathOther) {
            c.pkg[pkgPathOther].some(function (filepath) {
                if (minimatch(pkgPath, filepath)) {
                    rfs.push(pkgPathOther);
                }
            });
        });
        c.rfs[pkgPath] = rfs;
    });
    return c;
};

let findFileSync = function (filename, start, stop) {
    let filepath = path.join(start, filename), last = null;
    while (start !== stop && start !== last) {
        if (fs.existsSync(filepath)) {
            return filepath;
        }
        last = start;
        start = path.dirname(start);
        filepath = path.join(start, filename);
    }
};

let findRelateFiles = function (pathname, concatConfig) {
    let relateFiles = [pathname];
    let antiCompile = function (filepath) {
        concatConfig.rfs[filepath].forEach(function (f) {
            if (relateFiles.indexOf(f) === -1) {
                relateFiles.push(f);
                antiCompile(f);
            }
        });
    };

    if (concatConfig.pkg[pathname]) {
        antiCompile(pathname);
    }
    else {
        Object.keys(concatConfig.pkg).forEach(function (pkgPath) {
            concatConfig.pkg[pkgPath].some(function (filepath) {
                if (minimatch(pathname, filepath)) {
                    relateFiles.push(pkgPath);
                    antiCompile(pkgPath);
                    return true;
                }
                else {
                    return false;
                }
            });
        });
    }

    return relateFiles;
};

class LiveReload {

    constructor() {
        this.server = tinylr();
        this.server.listen(35729, function() {
            console.log('LiveReload server listening on port 35729');
        });
    }

    reload(...files) {
        console.log(chalk.cyan('This causes follow publish file(s) changed, refreshing browsers...'));
        for (let file of files) {
            console.log(file);
        }
        this.server.changed({body: {files: files}});
    }

}

let watch = function (options, gspdata, lint, livereload) {
    let watcher = chokidar.watch(options.cwd, {ignored: /\.git|node_modules/});
    console.log('Waiting for changes');
    watcher.on('change', function (filepath) {

        let gspconfig = findFileSync('.gspconfig', filepath, options.cwd);

        if (!gspconfig) {
            return;
        }

        let repoId = path.basename(path.dirname(gspconfig));
        let repoLocation = gspdata.get('repositories', repoId);
        let pathname = path.relative(repoLocation, filepath);

        gspconfig = fs.readJSONSync(gspconfig, {throws: false}) || {};

        console.log('\n%s changed', path.join(repoId, pathname));

        let problems = lint.lintFiles([pathname], gspconfig.lint);

        if (problems) {
            return;
        }

        if (!livereload) {
            return;
        }

        if (pathname === 'concatfile.json') {
            concatConfigs[repoId] = parseConcatConfig(repoLocation);
            return;
        }
        let concatConfig = concatConfigs[repoId];
        if (!concatConfig) {
            concatConfig = concatConfigs[repoId] = parseConcatConfig(repoLocation);
        }

        let relateFiles = findRelateFiles(pathname, concatConfig);

        relateFiles = relateFiles.map(function (filepath) {
            return path.relative(gspconfig.publish_dir, filepath);
        });

        relateFiles = relateFiles.filter(function (filepath) {
            return filepath.indexOf('..') !== 0;
        });

        relateFiles = relateFiles.map(function (filepath) {
            return path.join(gspconfig.mapping_dir, filepath);
        });

        if (relateFiles.length) {
            livereload.reload(...relateFiles);
        }
    });
};

exports.watch = function (options) {
    options.cwd = options.cwd || process.cwd();
    let module = {
        options: ['value', options],
        gspdata: ['value', gspdata],
        lint: ['value', lint]
    };
    if (options.livereload) {
        module.livereload = ['type', LiveReload];
    }
    else {
        module.livereload = ['value', false];
    }
    let injector = new di.Injector([module]);
    injector.invoke(watch);
};
