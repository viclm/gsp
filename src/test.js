const chalk = require('chalk');
const child_process = require('child_process');
const fs = require('fs-extra');
const glob = require('./util/glob');
const path = require('path');

let rFileStatus = /^[AM]\s+(.+)$/;

exports.testFiles = function (files, config) {
    if (!config) {
        console.log('test is not configed.');
        return;
    }
    let specFiles = [];
    for (let filename of files) {
        if (glob.match(filename, config.spec_files)) {
            specFiles.push(filename);
        }
        else if (glob.match(filename, config.src_files)) {
            let reg = new RegExp(`\\b${path.basename(filename).replace(/\.js/, '(?:\.js)?')}\\b`);
            specFiles = specFiles.concat(glob.find(config.spec_files).filter(function(filename) {
                return reg.test(filename);
            }));
        }
        else {
            continue;
        }
    }
    if (specFiles.length === 0) {
        console.log('No files needed to be tested');
    }
    else {
        specFiles = specFiles.map(function (filename) {
            return path.join(process.cwd(), filename);
        });
        let helperFiles = [];
        let helperFilesPatterns = config.helper_files.filter(function (pattern) {
            if (/^https?:\/\//.test(pattern)) {
                helperFiles.push(pattern);
                return false;
            }
            else {
                return true;
            }
        });
        helperFiles = helperFiles.concat(glob.find(helperFilesPatterns).map(function (filename) {
            return path.join(process.cwd(), filename);
        }));
        let Test = require(`./testers/${config.engine}`).Test;
        let test = new Test(specFiles, helperFiles);
        test.on('failed', function (result) {
            console.log(chalk.red('Spec: ' + result.name));
            for (let error of result.errors) {
                console.log('    ' + error.stack);
            }
            console.log('\n');
        });
        test.on('finish', function (stats) {
            let msg = `Executed ${stats.total} specs, ${stats.passed} ${chalk.green('passed')}, ${stats.failed} ${chalk.red('failed')}, ${stats.pending} pended.`;
            if (stats.failed === 0) {
                msg = chalk.white.bgGreen.bold(' OKAY ') + ' ' + msg;
            }
            console.log(msg);
        });
        test.run();
    }
};

exports.test = function () {
    child_process.exec('git diff --name-status HEAD', function (err, stdout) {
        if (err) {
            console.log(chalk.bold('Exception: ') + 'Not a git repo.');
        }
        else {
            if (stdout) {
                let files = [];
                for (let fileStatus of stdout.trim().split('\n')) {
                    let result = rFileStatus.exec(fileStatus);
                    if (result) {
                        files.push(result[1]);
                    }
                }
                if (files.length) {
                    let gspConfig = fs.readJSONSync(path.join(process.cwd(), '.gspconfig'), {throws: false}) || {};
                    exports.testFiles(files, gspConfig.test);
                }
                else {
                    console.log('No files changed.');
                }
            }
            else {
                console.log('No files changed.');
            }
        }
    });
};
