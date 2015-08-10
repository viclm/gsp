const gspdata = require('../util/gspdata');
const path = require('path');
const test = require('./test');
const jasmine = require('jasmine-core');

let rJasmineCore = /\/jasmine-core\//;

class Jasmine extends test.Test {

    constructor(specFiles, helperFiles) {
        super(specFiles, helperFiles);
        this.engineFiles = jasmine.files.jsFiles.map(function (filename) {
            return path.join(jasmine.files.bootDir, filename);
        });
        this.engineFiles.push(path.join(jasmine.files.bootDir, jasmine.files.bootFiles[0]));
    }

    run(callback) {
        super.run(callback);
    }

    reporter() {
        let code = `
        (function () {
            var sendMessage = function () {
                var args = Array.prototype.slice.call(arguments);
                alert(JSON.stringify(args));
            };
            var gspReporter = {
              specStarted: function (result) {sendMessage("spec.start", result);},
              specDone: function (result) {
                result.failedExpectations = result.failedExpectations.map(function(expect) {
                    delete expect.actual;
                    return expect;
                });
                sendMessage("spec.done", result);},
              jasmineDone: function () {sendMessage("spec.finish");}
            }
            jasmine.getEnv().addReporter(gspReporter);
        })();
        `;
        return gspdata.file('reporter.js', code);
    }

    onSpecDone(result) {
        this.specStats[result.status] += 1;
        if (result.status === 'failed') {
            this.emit('failed', {
                name: result.fullName,
                errors: result.failedExpectations.map(function (expect) {
                    return {
                        message: expect.message,
                        stack: expect.stack.split('\n').filter(function(line) {
                            return !rJasmineCore.test(line);
                        }).join('\n')
                    }
                })
            });
        }
        else {
            this.emit(result.status);
        }
        this.emit('done');
    }

}

exports.Test = Jasmine;
