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

let readfile = function (pathname, file, callback) {
    let repoMapping = gspdata.get('mapping');
    let repoId, filename;
    Object.keys(repoMapping).some(function (mappingDir) {
        let mappingDirfixed = mappingDir.replace(/^\/*/, '/').replace(/\/*$/, '/');
        if (pathname.indexOf(mappingDirfixed) === 0) {
            repoId = repoMapping[mappingDir];
            filename = pathname.slice(mappingDirfixed.length);
            return true;
        }
    });

    if (repoId) {
        let workdir = gspdata.get('repositories', repoId);
        let config = fs.readJSONSync(path.join(workdir, '.gspconfig'), {throws: false}) || {};
        filename = path.join(config.publish_dir || '', filename);
        file.set('workdir', workdir);
        file.set('filename', filename);
        file.set('config', config);
        file.read(callback);
    }
    else {
        callback(new Error('Git repository lacks.'));
    }
};

let start = function (options, watch, file) {

    options.port = options.port || 7070;

    let server = http.createServer();
    server.on('listening', function (err) {
        if (err) {
            console.log(chalk.red('Gsp simulator failed to start'));
        }
        else {
            console.log('Gsp simulator started, listening on port %s', options.port);
            if (options.livereload) {
                watch({
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
        readfile(pathname, file, function (err, filedata) {
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
    });
    server.listen(options.port);

};

exports.readfile = function (pathname, callback) {
    let injector = new di.Injector([{
        pathname: ['value', pathname],
        file: ['type', file.Concat],
        callback: ['value', callback]
    }]);
    injector.invoke(readfile);
};

exports.start = function (options) {
    if (options.daemon) {
        delete options.daemon;
        let args = process.argv.filter(function (arg) {
            return arg !== '-d' && arg !== '--daemon';
        });
        args.shift();
        let out = fs.openSync('out.log', 'a');
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
