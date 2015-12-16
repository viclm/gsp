const async = require('async');
const chalk = require('chalk');
const child_process = require('child_process');
const di = require('di');
const fs = require('fs-extra');
const gspdata = require('./util/gspdata');
const path = require('path');

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

let ready = function (options, callback) {
    let workspace = findFileSync('.gspworkspace', options.cwd);
    if (workspace) {
        let repos = fs.readFileSync(workspace, {encoding: 'utf8'}).match(/\S+/g);
        let rMaster = /^\*\smaster\b/m;
        let errors = [];
        let repoLocation = {}, repoMapping = {};
        async.eachLimit(repos, 4, function (repoUrl, callback) {
            let repoName = path.basename(repoUrl, '.git');
            let repoPath = path.join(path.dirname(workspace), repoName);
            let configRepo = function () {
                let gspconfig = path.join(repoPath, '.gspconfig');
                if (fs.existsSync(gspconfig)) {
                    repoLocation[repoName] = repoPath;
                    gspconfig = fs.readJSONSync(gspconfig, {throws: false}) || {};
                    if (gspconfig.mapping_dir) {
                        repoMapping[gspconfig.mapping_dir] = repoName;
                    }
                    let hookdir = path.join(repoPath, '.git/hooks/pre-commit');
                    fs.outputFileSync(hookdir, fs.readFileSync(path.join(__dirname, '../scripts/pre-commit')));
                    fs.chmodSync(hookdir, '751');
                }
                callback();
            };
            if (fs.existsSync(repoPath)) {
                child_process.exec('git branch', {
                    cwd: repoPath
                }, function (err, stdout) {
                    console.log(`Updating ${repoName}`);
                    if (rMaster.test(stdout)) {
                        child_process.exec('git pull origin master', {
                            cwd: repoPath
                        }, function (err, stdout, stderr) {
                            if (err) {
                                errors.push({
                                    repo: repoName,
                                    msg: stderr
                                });
                            }
                            configRepo();
                        });
                    }
                    else {
                        errors.push({
                            repo: repoName,
                            msg: 'Not in master branch, update skipped.'
                        });
                        configRepo();
                    }
                });
            }
            else {
                console.log(`Cloning ${repoName}`);
                child_process.exec(`git clone ${repoUrl}`, function (err, stdout, stderr) {
                    if (err) {
                        errors.push({
                            repo: repoName,
                            msg: stderr
                        });
                    }
                    configRepo();
                });
            }
        }, function () {
            gspdata.set('repositories', repoLocation);
            gspdata.set('mapping', repoMapping);
            if (errors.length === 0) {
                console.log(chalk.bold.green('\nAll repositories is up to date.'));
                callback();
            }
            else {
                console.log(chalk.bold.red('\nSome repositories are failed to update.\n'));
                callback(new Error(errors.map(function (e) {
                    return `Failed to update ${e.repo}\n${e.msg}`;
                }).join('\n\n')));
            }
        });
    }
    else {
        let error = new Error(`${options.cwd} is not a valid gsp workspace.`);
        error.toString = function () {
            return chalk.red(this.message);
        };
        callback(error);
    }
};


exports.ready = function (options, callback) {
    let injector = new di.Injector([{
        options: ['value', options],
        callback: ['value', callback || function (err) {
            if (err) {
                console.error(err.toString());
            }
        }]
    }]);
    injector.invoke(ready);
};
