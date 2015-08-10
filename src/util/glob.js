const minimatch = require('minimatch');
const glob = require('glob');

exports.match = function (filepath, patterns, options) {
    if (typeof patterns === 'string') {
        patterns = [patterns];
    }
    return patterns.some(function (pattern) {
        return minimatch(filepath, pattern, options);
    });
};

exports.find = function (patterns, options) {
    if (typeof patterns === 'string') {
        patterns = [patterns];
    }
    let files = glob.sync(patterns.shift(), options);
    for (let pattern of patterns) {
        for (let file of glob.sync(pattern, options)) {
            if (files.indexOf(file) === -1) {
                files.push(file);
            }
        }
    }
    return files;
}

exports.minimatch = minimatch;
exports.glob = glob;
