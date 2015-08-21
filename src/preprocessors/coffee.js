const coffee = require('coffee-script');

let rCoffee = /\.coffee$/;

let compileCoffee = function (filedata, callback) {
    let err = null;
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
            file.set('filename', file.get('filename').replace(rCoffee, '.js'));
            file.set('filedata', filedata);
        }
        callback(err);
    });
};
