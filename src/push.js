const child_process = require('child_process');
const di = require('di');
const publish = require('./publish');

let push = function (options, publish) {
    console.log('Pushing...');
    child_process.exec('git push origin master', function (err, stdout, stderr) {
        console.log((err && err.message || stdout || stderr).trim());
        if (!err) {
            console.log('\nPublishing...');
            publish(options);
        }
    });
};

exports.push = function (options) {
    let injector = new di.Injector([{
        options: ['value', options],
        publish: ['value', publish.publish]
    }]);
    injector.invoke(push);
};
