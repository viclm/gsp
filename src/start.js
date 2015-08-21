const chalk = require('chalk');
const child_process = require('child_process');
const di = require('di');
const gspdata = require('./util/gspdata');
const file = require('./file');
const fs = require('fs-extra');
const http = require('http');
const mine = require('mime');
const path = require('path');
const url = require('url');
const watch = require('./watch');

let $repoLocation = {};
let $repoMapping = {};

let start = function (options, watch, file) {

    if (!fs.existsSync(options.cwd + '/.gsp_workspace')) {
        console.log(chalk.red('Please run on the directory containing git repositories.'));
        return;
    }

    options.port = options.port || 7070;

    for (let repo of fs.readdirSync(options.cwd)) {
        let gspconfig = path.join(options.cwd, repo, '.gspconfig');
        if (!fs.existsSync(gspconfig)) {
            continue;
        }
        gspconfig = fs.readJSONSync(gspconfig, {throws: false}) || {};
        $repoLocation[repo] = path.join(options.cwd, repo);
        if (gspconfig.mapping_dir) {
            $repoMapping[gspconfig.mapping_dir] = repo;
        }
        let hookdir = path.join(options.cwd, repo, '.git/hooks/pre-commit');
        fs.outputFileSync(hookdir, fs.readFileSync(path.join(__dirname, '../scripts/pre-commit')));
        fs.chmodSync(hookdir, '751');
    }

    gspdata.set('repositories', $repoLocation);

    let server = http.createServer();
    server.on('listening', function (err) {
        if (err) {
            console.log(chalk.red('Gsp simulator failed to start'));
        }
        else {
            console.log('Gsp simulator started, listening on port %s', options.port);
            if (options.livereload) {
                watch({
                    base: options.cwd,
                    livereload: true
                });
            }
        }
    });
    server.on('request', function (request, response) {
        let pathname = url.parse(request.url).pathname;
        let output = function (code, data) {
            if (data) {
                data = new Buffer(data);
                response.writeHeader(code, {'content-type': mine.lookup(pathname), 'content-length': data.length});
                response.end(data);
            }
            else {
                response.end();
            }
        };
        let repoId, filename;
        Object.keys($repoMapping).some(function (mappingDir) {
            let mappingDirfixed = mappingDir.replace(/^\/*/, '/').replace(/\/*$/, '/');
            if (pathname.indexOf(mappingDirfixed) === 0) {
                repoId = $repoMapping[mappingDir];
                filename = pathname.slice(mappingDirfixed.length);
                return true;
            }
        });

        if (repoId) {
            let workdir = $repoLocation[repoId];
            let config = fs.readJSONSync(path.join(workdir, '.gspconfig'), {throws: false}) || {};
            filename = path.join(config.publish_dir || '', filename);
            file.set('workdir', workdir);
            file.set('filename', filename);
            file.set('config', config);
            file.read(function (err, filedata) {
                console.log('GET: ' + pathname);
                if (err) {
                    console.log(chalk.red(err.message));
                    if (filedata) {
                        output(502);
                    }
                    else {
                        output(404);
                    }
                }
                else {
                    output(200, filedata);
                }
            });
        }
        else {
            console.log('GET: ' + pathname);
            console.log(chalk.red('Git repository lacks.'));
            output(404);
        }
    });
    server.listen(options.port);

};

exports.start = function (options) {
    options.cwd = options.cwd || process.cwd();
    process.chdir(options.cwd);
    if (options.daemon) {
        delete options.daemon;
        let args = process.argv.filter(function (arg) {
            return arg !== '-d' && arg !== '--daemon';
        });
        args.shift();
        let out = fs.openSync(path.join(options.cwd, 'out.log'), 'a');
        child_process.spawn(args.shift(), args, {
            detached: true,
            stdio: ['ignore', out, out]
        });
    }
    else {
        let injector = new di.Injector([{
            options: ['value', options],
            watch: ['value', watch.watch],
            file: ['type', file.Concat]
        }]);
        injector.invoke(start);
    }
};
