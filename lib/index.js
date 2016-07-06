'use strict';

var extend = require('extend');
var Path = require('path');

var Builder;

function fromFileURL(address) {
  address = address.replace(/^file:(\/+)?/i, '');

  if (process.platform.match(/^win/)) {
    address = address.replace(/\//g, '\\');
  } else {
    address = '/' + address;
  }

  return address;
}

module.exports = function (options) {
  var builder;

  options = extend({
    baseUrl: process.cwd(),
    configFile: 'system.config.js'
  }, options || {});

  try {
    // Bet on JSPM first. Config is automatic
    Builder = require('jspm').Builder;

    builder = new Builder();
  } catch (err) {
    // JSPM not installed. Lets try systemjs-builder
    try {
      Builder = require('systemjs-builder');

      builder = new Builder(options.baseUrl, Path.resolve(options.baseUrl, options.configFile));
    } catch (err) {
      throw err;
    }
  }

  return function (req, res, next) {

    // Intercept SystemJS requests based on accept header
    var accept = req.get('accept');
    if (accept && accept.indexOf('application/x-es-module') !== -1) {

      var fileName = Path.join(fromFileURL(builder.loader.baseURL), req.path);

      builder.compile(fileName)
        .then(function (result) {
          // TODO: Use trace tree knowledge for later
          if (false) {
            // TODO: Find trace tree dependencies
            // TODO: Save depdnencies for mergin into config.js later
            console.log('FIXME: trace tree deps');
          }

          // TODO: Think about inlining already cached known dependencies of this module

          return result.source;
        })
        .then(function (result) {

            res.set({
              'Content-Type': 'application/javascript; charset=UTF-8'
            });

            res.send(result);
        })
        .catch(function (err) {
          err.statusCode = 500;
          next(err);
        });
    } else {
      next();
    }
  };
};
