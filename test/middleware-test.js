'use strict';

var app = require('../lib/index');
var expect = require('unexpected')
  .clone()
  .installPlugin(require('unexpected-express'));

describe('middleware', function () {
  it('should be defined', function () {
    return expect(app, 'to be a function');
  });
});
