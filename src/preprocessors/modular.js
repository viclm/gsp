const glob = require('../util/glob');
const path = require('path');

let rRequire = /^(?:var\s+?([\w$]+)\s*?=\s*?)?require\s*?\(\s*?(['"])(.+)\2\s*?\)\s*?;?\s*?$[\n\r]*/mg;
let rModuleWrapper = /^(define|require)\s*?\(/m;

let wrapModular = function (repoLocation, repoConfig, filePath, fileContent) {
    let moduleExports = [], moduleIds = [], moduleId;
    if (!repoConfig.modular || repoConfig.modular.ignore && glob.match(filePath, repoConfig.modular.ignore)) {
        return fileContent;
    }

    fileContent = fileContent.replace(rRequire, function (line, me, qoute, mi) {
        moduleExports.push(me || '__' + path.basename(mi) + '__');
        moduleIds.push(mi);
        return '';
    });

    if (!rModuleWrapper.test(fileContent)) {
        moduleIds.push('require', 'exports', 'module');
        moduleExports.push('require', 'exports', 'module');
        moduleId = filePath.slice(0, -path.extname(filePath).length).replace(/^[^\/]+\//, '');
        if (repoConfig.modular.idprefix) {
            moduleId = repoConfig.modular.idprefix + '/' + moduleId;
        }
        fileContent = "define('"+moduleId+"', ['"+moduleIds.join("','")+"'], function ("+moduleExports.join(",")+") {\n"+fileContent+"});";
    }
    return fileContent;
};

module.exports = function (file, callback) {
    let filedata = wrapModular(file.get('workdir'), file.get('config'), file.get('filename'), file.get('filedata'));
    file.set('filedata', filedata);
    callback();
};
