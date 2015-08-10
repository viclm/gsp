var coffee = require('coffee-script');

var compileCoffee = function (filedata, callback) {
    var err = null;
    try {
        filedata = coffee.compile(filedata, {
            bare: true
        });
    }
    catch (e) {
        console.log(e.toString().replace('[stdin]', '[coffee]'));
        err = new Error('CoffeeScript errors.');
    }
    finally {
        callback(err, filedata);
    }
};

module.exports = function (file, callback) {
    compileCoffee(file.get('filedata'), function (err, filedata) {
        if (!err) {
            file.set('filedata', filedata);
        }
        callback(err);
    });
};
