'use strict';

var Builder = require('systemjs-builder');
var Path = require('path');

// function getModuleSource(loader, module) {
//   return loader.normalize(module)
//   .then(function(normalized) {
//     return loader.locate({ name: normalized, metadata: {} });
//   })
//   .then(function(address) {
//     return loader.fetch({ address: address, metadata: {} });
//   })
//   .then(function(fetched) {
//     // allow to be a redirection module
//     var redirection = fetched.toString().match(/^\s*module\.exports = require\(\"([^\"]+)\"\);\s*$/);
//     if (redirection)
//       return getModuleSource(loader, redirection[1]);
//     return fetched;
//   });
// }

var interceptor = require('express-interceptor');

module.exports = function (options) {
  var builder;

  options = options || {
    workDir: process.cwd()
  };

  // TODO: Allow manual configuration here
  var jspm = require(Path.join(options.workDir, 'package.json')).jspm;
  var baseUrl = jspm.directories.baseURL || '';
  var configUrl = jspm.configFile || Path.join(baseUrl, 'config.js');

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
        return req.accepts('module/x-module-loader-module');
      },
      intercept: function (body, send) {
        var upstreamETag;

        if (res.statusCode === 304) {
          upstreamETag = res.getHeader('ETag');

          if (upstreamETag && !(/-systemjs-translate"$/.test(upstreamETag))) {
            res.setHeader('ETag', upstreamETag.replace(/"$/, '-systemjs-translate"'));
          }

          send(body);
        } else if (res.statusCode === 200) {
          // Initiate builder if needed
          if (!builder) {
            builder = (new Builder()).loadConfig(configUrl);
          }

          // Do the SystemJS translation here
          builder.then(function () {
            return builder.build('[' + req.path + ']');
          })
          .then(function (result) {
            console.log(result);

            return result;
          })
          .then(function (result) {
            res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
            res.setHeader('Content-Length', Buffer.byteLength(result));

            send(result);
          })
          .catch(function (err) {
            delete req['if-none-match'];

            res.status(500);
            res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
            res.setHeader('Content-Length', Buffer.byteLength(err.message));

            send(err.message);
          });

        }

      }
    };
  });
};
