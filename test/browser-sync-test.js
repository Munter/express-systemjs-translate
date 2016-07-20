'use strict';

var bs = require('browser-sync').create();
var expect = require('unexpected').clone();
var translate = require('../lib/index');

expect.use(require('unexpected-http'));

before(function (done) {
  bs.init({
    port: '9999',
    server: 'fixtures',
    open: false,
    logLevel: 'silent',
    middleware: [
      translate('fixtures', {
        bundle: false
      })
    ]
  }, done);
});

after(function () {
  bs.exit();
});

describe('browsersync middleware', function () {
  it('should respond with unmodified sources when no accept header is sent', function () {
    return expect('GET http://localhost:9999/default.js', 'to yield response', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/javascript'
      },
      body: 'console.log(\'hello world\');\n'
    });
  });

  it('should respond with modified sources when accept header is sent', function () {
    return expect({
      url: 'http://localhost:9999/default.js',
      headers: {
        accept: 'application/x-es-module */*'
      }
    }, 'to yield response', {
      statusCode: 200,
      headers: {
        'Content-Type': /^application\/javascript/
      },
      body: expect.it('to begin with', 'System.registerDynamic([]').and('to contain', 'console.log(\'hello world\');\n')
    });
  });
});

