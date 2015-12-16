# Gsp
[![Build Status](https://secure.travis-ci.org/viclm/gsp.png?branch=master)](http://travis-ci.org/viclm/gsp)
[![Dependecies Status](https://david-dm.org/viclm/gsp.png)](https://david-dm.org/viclm/gsp)

Gsp是一个前端自动化构建工具，它包含一系列常用的任务例如编译、单元测试和Linting，同时可以很方便的添加自定义任务。

目前包含的任务

- CoffeeScript／ES2015／Less／Sass自动编译
- 文件合并
- 模块化
- 单元测试
- Lint
- 工程脚手架
- 自动刷新浏览器
- 自动监测文件修改

## 安装

使用NPM安装： `npm install -g gsp`

## 工作区配置

新建一个包含名为 **.gspworkspace** 文件的目录，文件内容为代码仓库的远程地址，每个仓库独占一行。

运行`gsp ready`克隆所有仓库并更新工作区配置，以后随时可以使用这个命令一键更新仓库。`gsp ready`命令会根据 **.gspworkspace** 文件指定的仓库地址智能克隆/更新仓库，并更新Gsp工作区配置。

## 仓库配置

每个仓库（以下简称Gsp仓库）需要包含一个 **.gspconfig** 文件。

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
  "modular": {
    "type": "amd",
    "idprefix": "home",
    "ignore": "+(lib|src|test)/**"
  },
  "preprocessors": {
      "coffee": ["coffee", "modular"],
      "less": ["less"],
      "js": ["es6", "modular"]
  }
}
```

## 模拟器

Gsp仓库中的代码不能直接在浏览器中运行，需要使用 [Gsp-deploy](https://www.npmjs.com/package/gsp-deploy) 编译部署。在开发阶段，Gsp提供了一个本地模拟器，它根据HTTP请求即时编译文件，达到本地调试效果。

运行`gsp start`，默认开启**7070**端口。

需要配置Web服务器转发文件请求（以Nginx为例，其他可自行参照配置）。

## 配置Nginx

```text
server {
  listen       80;
  server_name  static.resource.com;
  charset utf-8;

  rewrite (.*)_[0-9a-z]+(\.[a-z]+)$ $1$2;

  location ~* \.(?:ttf|eot|woff)$ {
      add_header "Access-Control-Allow-Origin" "*";
      expires 1M;
      access_log off;
      add_header Cache-Control "public";
      proxy_pass http://127.0.0.1:7070;
  }

  location ~* /.+\.[a-z]+$ {
      proxy_pass http://127.0.0.1:7070;
  }
}
```

## 帮助

运行`gsp help`查看完整的命令列表，运行`gsp help <command>`查看某个命令的详细信息。

## 贡献
Gsp使用ES2015，可运行`grunt watch`实时编译源码。

## 发布历史
_(Nothing yet)_

## License
Copyright (c) 2015 viclm
Licensed under the MIT license.
