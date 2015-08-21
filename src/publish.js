const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const net = require('net');

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

exports.publish = function (options) {
    let repoLocation = findFileSync('.gspconfig', process.cwd());
    if (repoLocation) {
        options.repo = path.basename(path.dirname(repoLocation));
    }
    else {
        process.stdout.write(chalk.bold('Usage Exception: '));
        console.log('Unable to find local config file.\n');
        console.log('Make sure your repository contains a `.gspconfig` file, and');
        console.log('run this command on the directory of repository.');
        process.exit();
    }

    http.get({
        host: process.env.GSP_HOST || 'gsp.com',
        path: '/gsp/publish?' + JSON.stringify(options)
    }, function (response) {
        let data = '';
        response.on('data', function (chunk) {
            data += chunk.toString();
        });
        response.on('end', function () {
            if (/^\d+$/.test(data)) {
                let client = new net.Socket;
                client.connect(Number(data), process.env.GSP_HOST || 'gsp.com');
                client.on('data', function (data) {
                    data.toString().split('@@@').slice(0, -1).forEach(function (log) {
                        console.log(log);
                    });
                });
                client.on('end', function () {
                    client.end();
                });
                client.on('error', function () {
                    client.destroy();
                });
            }
            else {
                console.log(data);
            }
        });
    });
};
