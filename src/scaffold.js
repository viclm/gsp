const async = require('async');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt');

let mkdir = function (dir) {
    return function (callback) {
        process.stdout.write('Make ' + dir + '/ ... ');
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, function (err) {
                if (err) {
                    console.log(err.message.red);
                }
                else {
                    console.log(chalk.green('OK'));
                }
                callback(err);
            });
        }
        else {
            console.log(chalk.green('OK'));
            callback();
        }
    };
};

let scaffolding = function (projectInfo, callback) {
    async.waterfall([
        mkdir('src'),
        mkdir('dist'),
        mkdir('test'),
        mkdir('doc'),
        function (callback) {
            process.stdout.write('Write .gspconfig ... ');
            let tmpl = fs.readFileSync(path.join(__dirname, 'scaffolds/_gspconfig'), {encoding: 'utf8'});
            tmpl = tmpl.replace(/\{\{(.+?)\}\}/g, function (str, p) {
                return projectInfo[p];
            });
            fs.writeFileSync('.gspconfig', tmpl);
            console.log(chalk.green('OK'));
            callback();
        },
        function (callback) {
            let scaffolds = path.join(__dirname, 'scaffolds');
            fs.readdirSync(scaffolds).forEach(function (filename) {
                if (filename === '_gspconfig') {
                    return;
                }
                let fn = filename.replace(/^_/, '.');
                process.stdout.write('Write ' + fn + ' ... ');
                fs.writeFileSync(fn, fs.readFileSync(path.join(scaffolds, filename)));
                console.log(chalk.green('OK'));
            });
            callback();
        }
    ], callback);
};

exports.scaffold = function (options, projectInfo) {

    if (!projectInfo) {
        console.log('This command will create several directries and files in the current');
        console.log('directory for a gsp project, based on the answers to a few questions.');
        console.log('A gsp project means it contains a '+chalk.bold('.gspconfig')+' file for interacting');
        console.log('with gsp, and also some config files for concat, lint, test and so on.');
        projectInfo = {};
    }

    if (!options.force && fs.readdirSync(process.cwd()).length) {
        console.log(chalk.yellow('\nWarning: Existing files may be overwritten! Use --force(-f) to continue.'));
        console.log(chalk.red('\nAborted due to warnings.'));
        return;
    }

    console.log(chalk.bold('\nPlease answer the following:'));
    let schema = [
        {
            'name': 'name',
            'message': 'Project name',
            'default': projectInfo.name || path.basename(process.cwd())
        },
        {
            'name': 'description',
            'message': 'Project description',
            'default': projectInfo.description,
            'required': true
        },
        {
            'name': 'publishDir',
            'message': 'Publish directory',
            'default': projectInfo.publishDir || 'dist'
        },
        {
            'name': 'mappingDir',
            'message': 'Mapping directory for http request',
            'default': projectInfo.mappingDir || path.basename(process.cwd()),
            'required': true
        },
        {
            'name': 'confirm',
            'message': chalk.green('Do you need to make any changes to the above before continuing'),
            'default': 'y/N'
        }
    ];
    prompt.message = chalk.green('[?]');
    prompt.delimiter = ' ';
    prompt.start();
    prompt.get(schema, function (err, result) {
        if (err) {
            process.exit(1);
        }
        let continuing = result.confirm.toLowerCase() !== 'y';
        delete result.confirm;
        if (continuing) {
            console.log('');
            scaffolding(result, function (err) {
                if (err) {
                    console.log(chalk.red('\nAborted due to warnings.'));
                }
                else {
                    console.log(chalk.green('\nDone, without errors.'));
                }
            });
        }
        else {
            exports.scaffold(options, result);
        }
    });
};
