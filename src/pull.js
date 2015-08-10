const async = require('async');
const chalk = require('chalk');
const child_process = require('child_process');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const prompt = require('prompt');
const url = require('url');

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

let clone = function (repos, options, callback) {
    let rUsername = /^(\/\/)?[^\/@]+@/;
    async.eachLimit(repos, 5, function (repo, callback) {
        child_process.exec(`git clone ${repo.url.replace(rUsername, '$1' + options.user + '@')} ${repo.pathname}`, function (err, stdout, stderr) {
            console.log(`\nClone ${repo.url}`);
            console.log((err && err.message || stdout || stderr).trim());
            callback();
        });
    }, callback);
};

let update = function (repos, options, callback) {
    let rMaster = /^\*\smaster\b/m;
    async.eachLimit(repos, 5, function (repo, callback) {
        child_process.exec('git branch', {
            cwd: repo
        }, function (err, stdout) {
            if (rMaster.test(stdout)) {
                child_process.exec('git pull origin master', {
                    cwd: repo
                }, function (err, stdout, stderr) {
                    console.log(`\nUpdate ${repo}`);
                    console.log((err && err.message || stdout || stderr).trim());
                    callback();
                });
            }
            else {
                callback();
            }
        });
    }, callback);
};

let pull = function (repos, options) {
    let cloneRepos = [], updateRepos = [];
    repos.forEach(function (remoteUrl) {
        let repo = url.parse(remoteUrl).pathname.slice(1, -4);
        if (fs.existsSync(repo)) {
            updateRepos.push(repo);
        }
        else {
            cloneRepos.push({
                pathname: repo,
                url: remoteUrl
            });
        }
    });
    async.series([
        function (callback) {
            if (cloneRepos.length && !options.user) {
                prompt.message = chalk.green('[?]');
                prompt.delimiter = ' ';
                prompt.start();
                prompt.get([{
                    'name': 'username',
                    'message': 'Enter username to clone',
                    'required': true
                }], function (err, result) {
                    options.user = result.username;
                    callback();
                });
            }
            else {
                callback();
            }
        },
        function (callback) {
            if (cloneRepos.length) {
                clone(cloneRepos, options, callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            update(updateRepos, options, callback);
        }
    ], function () {
        console.log(chalk.green('\nAll repositories is up to date.'));
    });
};

exports.pull = function (options) {
    let cwd = process.cwd();
    let workspace = findFileSync('.gsp_workspace', cwd);
    if (workspace) {
        process.chdir(path.dirname(workspace));
    }
    else {
        prompt.message = chalk.green('[?]');
        prompt.delimiter = ' ';
        prompt.start();
        prompt.get([{
            'name': 'workspace',
            'message': 'Clone all repositories to ' + cwd + '?',
            'default': 'Y/n'
        }], function (err, result) {
            if (result && result.workspace.toLowerCase() !== 'n') {
                fs.writeFileSync(path.join(cwd, '.gsp_workspace'), '');
                exports.pull(options);
            }
            else {
                console.log('\nPull cancelled.');
            }
        });
        return;
    }
    http.get({
        host: process.env.GSP_HOST || 'gsp.com',
        path: '/gsp/pull'
    }, function (response) {
        let data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            pull(JSON.parse(data), options);
        });
    }).on('error', function () {
        console.log(chalk.red('Make sure hosts are configed correctly.'));
    });
};
