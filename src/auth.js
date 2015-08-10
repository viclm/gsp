const chalk = require('chalk');
const http = require('http');
const prompt = require('prompt');


exports.auth = function () {
    console.log('Update authentication infomation for interacting with subversion repository.');
    prompt.message = chalk.green('[?]');
    prompt.delimiter = ' ';
    prompt.start();
    prompt.get([
        {
            name: 'username',
            required: true
        },
        {
            name: 'password',
            required: true,
            hidden: true
        }
    ], function (err, result) {
        http.get({
            host: process.env.GSP_HOST || 'gsp.com',
            path: '/gsp/auth?' + encodeURIComponent(JSON.stringify(result))
        },
        function (response) {
            let data = '';
            response.on('data', function (chunk) {
                data += chunk;
            });
            response.on('end', function () {
                console.log(data);
            });
        }).on('error', function (e) {
            console.log(chalk.red('Network error. Code: %s.'), e.code);
        });
    });
};
