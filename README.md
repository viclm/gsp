# Gsp
[![Build Status](https://secure.travis-ci.org/viclm/gsp.png?branch=master)](http://travis-ci.org/viclm/gsp)
[![Dependecies Status](https://david-dm.org/viclm/gsp.png)](https://david-dm.org/viclm/gsp)

## Intro

Gsp encourages to use multiple git repositories for development and one subversion repository for production to make code clean, it will be in charge of the synchronous work.
Use multiple repositories is very suitable for frontend development, it encourages a independent workflow and can be easly integrated with other tools like JIRA and Phabraicator.
Especially, gsp allow static resource files(like javascript and css) combining across repositories which has great significance to the performance of webpage.

Gsp uses git hooks(pre-commit) to integrate lint and unit tests, besides it support coffee and less autocompiling.

## Installation

Install the application with: `npm install -g gsp`.

## The simulator

Gsp has simulator running for generating temple files based on resource requst, in additon, it can accomplish some tasks like lint and unit tests before commiting changes.

1. Run `gsp pull` in a new directory(path/to/workspace, for example) to clone all the development repositories.
2. Run `gsp start` on directory above to start a simulator for resource requst
3. Config a webserver(nginx/apache/lighttpd) and start

## Config nginx

```text
server {
  listen       80;
  server_name  static.resource.com;
  charset utf-8;

  location ~* \.(?:ttf|eot|woff)$ {
      add_header "Access-Control-Allow-Origin" "*";
      expires 1M;
      access_log off;
      add_header Cache-Control "public";
      proxy_set_header x-request-filename $request_filename;
      proxy_pass http://127.0.0.1:7070;
  }

  location ~* /.+\.[a-z]+$ {
      proxy_pass http://127.0.0.1:7070;
  }
}
```

## Configs for communication

Gsp use a special domain "gsp.com" for interacting with server, this domain must link to the machine where the gsp server runs.
You can bind it in your DNS provider, or just edit the hosts file.

```text
192.168.1.110 gsp.com
```

## Repository configuration

Every development repository should contain a `.gspconfig` file.

```
{
  "publish_dir" : "dist",
  "mapping_dir" : "app/home",
  "lint": {
    "js": {
      "engine": "eslint",
      "config": "eslint.json"
    },
    "css": {
      "engine": "csslint",
      "config": "csslint.json"
    }
  },
  "test": {
    "engine": "jasmine",
    "src_files": "src/**/*.js",
    "spec_files": "test/spec/**/*.js",
    "helper_files": "test/helper/**/*.js"
  },
  "compress": {
      "png": true
  },
  "modular": {
    "type": "amd",
    "idprefix": "home",
    "ignore": "+(lib|src|test)/**"
  },
  "preprocessors": {
      "coffee": ["coffee", "modular"],
      "less": ["less"],
      "js": ["modular"]
  }
}
```

## Commands
1. gsp auth                 update authentication infomation for interacting with subversion repository
2. gsp lint                 run linter on files changed
3. gsp publish [options]    publish git changesets to subversion
4. gsp push                 git push origin master and publish
5. gsp pull                 clone/update all the git repositories
6. gsp scaffold [options]   generate project scaffolding
7. gsp start [options]      start a local proxy server
8. gsp test                 run test specs against chaned files
9. gsp watch [options]      run tasks whenever watched files are added, changed or deleted

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2014 viclm
Licensed under the MIT license.
