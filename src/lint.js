const chalk = require('chalk');
const child_process = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const rFileStatus = /^[AM]\s+(.+)$/;

exports.lintFiles = function (files, config) {
    if (!config) {
        console.log('Lint is not configed.');
        return;
    }
    let filesLinted = 0;
    let lintErrors = 0;
    for (let filename of files) {
        let lintConfig = config[path.extname(filename).slice(1)];
        if (lintConfig) {
            let Lint = require(`./linters/${lintConfig.engine}`).Lint;
            let lint = new Lint(filename, lintConfig.config, lintConfig.ignore);
            let result = lint.lint();
            if (typeof result !== 'undefined') {
                filesLinted += 1;
                if (result) {
                    lintErrors += 1;
                }
            }
        }
    }
    if (filesLinted === 0) {
        console.log('No files needed to be linted');
    }
    else if (!lintErrors) {
        console.log('\n' + chalk.white.bgGreen.bold(' OKAY ') + ' No lint errors.');
    }
    return lintErrors;
};

exports.lint = function () {
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
                    exports.lintFiles(files, gspConfig.lint);
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
