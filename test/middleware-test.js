'use strict';

var express = require('express');
var middleware = require('../lib/index');
var expect = require('unexpected')
  .clone()
  .installPlugin(require('unexpected-express'));

var app = express()
  .use(middleware({
    workDir: '../fixtures'
  }))
  .use(express.static('../fixtures'));

describe('middleware', function () {
  it('should be defined', function () {
    return expect(app, 'to be a function');
  });
});
