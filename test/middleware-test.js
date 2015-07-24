'use strict';

var Path = require('path');
var express = require('express');
var middleware = require('../lib/index');
var expect = require('unexpected')
  .clone()
  .installPlugin(require('unexpected-express'));

var root = Path.resolve(__dirname, '../fixtures');

var app = express()
  .use(middleware({
    workDir: root
  }))
 .use(express.static(root));

describe('middleware', function () {
  it('should be defined', function () {
    return expect(app, 'to be a function');
  });

  describe('when requesting files wihtout the systemjs accepts header', function () {
    it('should pass javascript through unmodified', function () {
      return expect(app, 'to yield exchange', {
        request: '/default.js',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/javascript'
          },
          body: 'console.log(\'hello world\');\n'
        }
      });
    });

    it('should pass html through unmodified', function () {
      return expect(app, 'to yield exchange', {
        request: '/default.html',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          },
          body: '<h1>Hello World</h1>\n'
        }
      });
    });

    it('should pass css through unmodified', function () {
      return expect(app, 'to yield exchange', {
        request: '/default.css',
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/css; charset=UTF-8'
          },
          body: 'body { color: hotpink; }\n'
        }
      });
    });
  });

  describe('when requesting files with the systemjs accepts header', function () {
    it('should pass javascript through unmodified', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/default.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': /^application\/javascript/
          },
          body: expect.it('to match', /^System\.registerDynamic\("fixtures\/default\.js"/).and('to contain', 'console.log(\'hello world\');\n')
        }
      });
    });
  });
});
