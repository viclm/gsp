const program = require('commander');
const pkg = require('../package.json');

let run = function (command) {
    require('./' + command.name())[command.name()](command.opts());
};

program
.version(pkg.version);

program
.command('help [cmd]')
.description('display help for [cmd]')
.action(function (cmd) {
    program.commands.some(function (command) {
        if (command.name() === cmd) {
            command.help();
        }
    });
    if (cmd) {
        console.log("'\s' is not a gsp command. See 'gsp --help'.", cmd);
    }
    else {
        program.help();
    }
});

program
.command('lint')
.description('run linter on files changed')
.action(run);

program
.command('ready')
.option('--cwd <dir>', 'path to workspace which must contain a gsp_workspace file, default is process.cwd()')
.description('clone/update all the git repositories and configure workspace')
.action(run);

program
.command('scaffold')
.description('generate project scaffolding')
.option('-f, --force', 'force run on a non empty directory')
.action(run);

program
.command('start')
.description('start a local proxy server')
.option('-d, --daemon', 'run server on daemon mode')
.option('-p, --port <port>', 'the port for the server listening')
.option('--livereload', 'enable LiveReload')
.action(run);

program.command('test')
.description('run test specs against chaned files')
.action(run);

program
.command('watch')
.description('run tasks whenever watched files are added, changed or deleted')
.option('--cwd <dir>', 'path to the working directory, default is process.cwd()')
.option('--livereload', 'enable LiveReload')
.action(run);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.help();
}
