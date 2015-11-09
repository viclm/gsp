const async = require('async');
const chalk = require('chalk');
const child_process = require('child_process');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const prompt = require('prompt');

let rsshuser = /^(?!git@)(?:ssh:\/\/)?([\w-.]+)@/;

let warns = [];
let errors = [];

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
    async.eachLimit(repos, 5, function (repo, callback) {
        repo = repo.replace(rsshuser, function (s, p) {
            return s.replace(p, options.user);
        });
        console.log(`Cloning ${repo}`);
        child_process.exec(`git clone ${repo}`, function (err, stdout, stderr) {
            if (err) {
                errors.push({
                    repo: repo,
                    msg: stderr
                });
            }
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
            console.log(`Updating ${repo}`);
            if (rMaster.test(stdout)) {
                child_process.exec('git pull origin master', {
                    cwd: repo
                }, function (err, stdout, stderr) {
                    if (err) {
                        errors.push({
                            repo: repo,
                            msg: stderr
                        });
                    }
                    callback();
                });
            }
            else {
                warns.push({
                    repo: repo,
                    msg: 'Not in master branch, update skipped.'
                });
                callback();
            }
        });
    }, callback);
};

let pull = function (repos, options) {
    let cloneRepos = [], updateRepos = [];
    async.series([
        function (callback) {
            repos.forEach(function (remoteUrl) {
                let repo = path.basename(remoteUrl, '.git');
                if (fs.existsSync(repo)) {
                    updateRepos.push(repo);
                }
                else {
                    cloneRepos.push(remoteUrl);
                }
            });
            callback();
        },
        function (callback) {
            let hasPlaceholder = cloneRepos.some(function (u) {
                return rsshuser.test(u);
            });
            if (hasPlaceholder && !options.user) {
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
            clone(cloneRepos, options, callback);
        },
        function (callback) {
            update(updateRepos, options, callback);
        }
    ], function () {
        if (warns.length) {
            for (let log of warns) {
                console.log(`\n${chalk.bold.bgYellow(' WARN ')} ${log.repo}`);
                console.log(log.msg);
            }
        }
        if (errors.length) {
            console.log(chalk.bold.red('\nPull finished with errors.'));
            for (let log of errors) {
                console.log(`\n${chalk.bold.white.bgRed(' ERROR ')} ${log.repo}`);
                console.log(log.msg);
            }
        }
        else {
            console.log(chalk.bold.green('\nAll repositories is up to date.'));
        }
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
            try {
                data = JSON.parse(data);
            }
            catch (e) {
                console.log(chalk.red('The response is not a valid JSON string of repositories.'));
                process.exit();
            }
            pull(data, options);
        });
    });
};
