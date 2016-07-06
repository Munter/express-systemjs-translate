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
    baseUrl: root,
    configFile: 'config.js'
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
    it('should compile javascript', function () {
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
          body: expect.it('to begin with', 'System.registerDynamic([]').and('to contain', 'console.log(\'hello world\');\n')
        }
      });
    });

    it('should handle commonjs', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/lib/stringExport.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': /^application\/javascript/
          },
          body: expect.it('to begin with', 'System.registerDynamic([]').and('to contain', 'module.exports = \'foo\';\n')
        }
      });
    });

    it('should handle commonjs imports', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/lib/requireWorking.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': /^application\/javascript/
          },
          body: expect.it('to begin with', 'System.registerDynamic(["./stringExport"]').and('to contain', 'var foo = $__require(\'./stringExport\');\n  module.exports = {foo: foo};\n')
        }
      });
    });

    it('should pass uncompileable errors through to the client', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/lib/broken.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: {
          errorPassedToNext: /Unterminated String Literal/,
          statusCode: 500
        }
      });
    });

    it('should handle commonjs imports of broken assets', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/lib/requireBroken.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': /^application\/javascript/
          },
          body: expect.it('to begin with', 'System.registerDynamic(["./broken"]').and('to contain', 'var foo = $__require(\'./broken\');\n  module.exports = {foo: foo};\n')
        }
      });
    });

    it('should handle jspm modules', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/jspm_packages/github/components/jquery@2.1.4.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: {
          statusCode: 200,
          headers: {
            'Content-Type': /^application\/javascript/
          },
          body: expect.it('to begin with', '(function() {\nvar define = System.amdDefine;\ndefine(["github:components/jquery@2.1.4/jquery"]')
        }
      });
    });

    it('should return a 304 status code if ETag matches', function () {
      return expect(app, 'to yield exchange', {
        request: {
          url: '/default.js',
          headers: {
            accepts: 'module/x-module-loader-module */*'
          }
        },
        response: 200
      })
      .then(function (context) {
        return expect(app, 'to yield exchange', {
          request: {
            url: '/default.js',
            headers: {
              accepts: 'module/x-module-loader-module */*',
              'If-None-Match': context.res.get('etag')
            }
          },
          response: 304
        });
      });
    });

  });
});
