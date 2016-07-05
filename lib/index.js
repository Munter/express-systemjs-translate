'use strict';

var when = require('when');
var extend = require('extend');
var Path = require('path');
var interceptor = require('express-interceptor');
var Builder;

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

  return interceptor(function (req, res) {
    // Prevent If-None-Match revalidation with the downstream middleware with ETags that aren't suffixed with "-systemjs-translate":
    var ifNoneMatch = req.headers['if-none-match'];

    if (ifNoneMatch) {
      var validIfNoneMatchTokens = ifNoneMatch.split(' ').filter(function (etag) {
        return /-systemjs-translate\"$/.test(etag);
      });

      if (validIfNoneMatchTokens.length > 0) {
        // Give the upstream middleware a chance to reply 304:
        req.headers['if-none-match'] = validIfNoneMatchTokens.map(function (validIfNoneMatchToken) {
          return validIfNoneMatchToken.replace(/-systemjs-translate(["-])$/, '$1');
        }).join(' ');
      } else {
        delete req.headers['if-none-match'];
      }
    }

    delete req.headers['if-modified-since']; // Prevent false positive conditional GETs after enabling jsxtransform

    return {
      isInterceptable: function () {
        // Only intercept if this comes from a module loader that set this accept header.
        // Known loaders that do this: SystemJS

        // TODO: Also intercept config.js

        return req.get('accepts') && req.get('accepts').indexOf('module/x-module-loader-module') !== -1;
      },
      intercept: function (body, send) {
        // TODO: This would be a nice place to intercept config.js and amend it with niceness
        if (false) {
          // TODO: Read in config.js
          // TODO: append known module deps so systemjs can loads things up front on next reload
          // TODO: Strip any cache headers. This file should always be reloaded

          send('FIXME');
        }

        var upstreamETag;

        if (res.statusCode === 304) {
          upstreamETag = res.getHeader('ETag');

          if (upstreamETag && !(/-systemjs-translate"$/.test(upstreamETag))) {
            res.setHeader('ETag', upstreamETag.replace(/"$/, '-systemjs-translate"'));
          }

          send(body);
        } else if (res.statusCode === 200) {
          var fileName = Path.join(options.baseUrl.replace('file://', ''), req.path);

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
          }, when.reject) // Why do I need to catch and re-reject here?
          .then(function (result) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            res.setHeader('Content-Length', Buffer.byteLength(result));

            send(result);
          })
          .catch(function () {
            delete req['if-none-match'];

            send(body);
          });

        }

      }
    };
  });
};
