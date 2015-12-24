const path = require('path');

const rrequire = /require\(\s*?(['"])(.+?)\1\s*?\)/g;
const rexportsmodule = /\b(exports|module)\b/g;
const rdefine = /^(define\(\s*)((?:\[.+\]\s*,\s*)?function\b)/m;
const rdefineWithId = /^define\(\s*(['"]).+?\1\s*,\s*(?:\[.+\]\s*,\s*)?function\b/m;
const rclosurewrapper = /^\(\s*function\b/m;

const defaultConfig = {
    type: 'amd',
    idprefix: '',
    loadfunction: 'require',
    trimleading: 'src|dist'
};

let wrapModular = function (filePath, fileContent, repoConfig) {
    let moduleConfig = Object.assign(defaultConfig, repoConfig.modular);
    if (rclosurewrapper.test(fileContent) || rdefineWithId.test(fileContent) || new RegExp(`^${moduleConfig.loadfunction}\\(`, 'm').test(fileContent)) {
        return fileContent;
    }
    let moduleId = filePath.slice(0, -path.extname(filePath).length).replace(new RegExp('^(?:' + moduleConfig.trimleading + ')/'), '');
    if (moduleConfig.idprefix) {
        moduleId = moduleConfig.idprefix + '/' + moduleId;
    }
    let parseDependencies = true;
    fileContent = fileContent.replace(rdefine, function (str, p1, p2) {
        parseDependencies = false;
        return p1 + moduleId + ', ' + p2;
    });
    if (parseDependencies) {
        let moduleIds = [], moduleExports = [];
        let require;
        while (require = rrequire.exec(fileContent)) {//eslint-disable-line
            moduleIds.push(require[2]);
        }
        if (moduleIds.length > 0) {
            if (moduleConfig.type === 'amd') {
                moduleIds.push('require');
            }
            moduleExports.push('require');
        }
        let exportsmodule = fileContent.match(rexportsmodule);
        if (exportsmodule) {
            exportsmodule = Array.from(new Set(exportsmodule)).sort();
            if (moduleConfig.type === 'amd') {
                moduleIds.push(...exportsmodule);
            }
            moduleExports.push(...exportsmodule);
        }
        if (moduleIds.length > 0) {
            fileContent = `define('${moduleId}', ['${moduleIds.join("','")}'], function(${moduleExports.join(",")}) {\n${fileContent}\n});`;
        }
        else {
            fileContent = `define('${moduleId}', function() {\n${fileContent}\n});`;
        }
    }
    return fileContent;
};

module.exports = function (file, callback) {
    let filedata = wrapModular(file.get('filename'), file.get('filedata'), file.get('config'));
    file.set('filedata', filedata);
    callback();
};
