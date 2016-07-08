'use strict';

var extend = require('extend');
var Path = require('path');
var Gaze = require('gaze').Gaze;
var chalk = require('chalk');

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
    configFile: 'system.config.js',
    compileOnly: false,
    watchFiles: true,
    debug: false
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

  if (options.watchFiles) {
    var fileWatcher = new Gaze('', {
        debounceDelay: 1
        // cwd: '/'
    });

    var watchFiles = function watchFiles(files) {
      if (!Array.isArray(files)) {
        return;
      }

      fileWatcher.add(files, function (error) {
        if (options.deubg) {
          if (error) {
            console.error(chalk.red('express-systemjs-translate: Error setting up file watches'));
            console.error(chalk.red(error));
          } else {
            console.error('express-systemjs-translate: Watching modules:\n\t', files.join('\n\t'));
          }
        }
      });
    };

    fileWatcher.on('all', function (event, path) {
      if (event === 'deleted' || event === 'renamed') {
        // OSX combined with editors that do atomic file replacements
        // will not emit 'change' events: https://github.com/joyent/node/issues/2062
        // Remove the file watch and assume it will be re-added when the main file is requested again
        builder.invalidate(path);
        return;
      }

      if (event === 'changed') {
        builder.invalidate(path);
      }
    });
  }

  return function (req, res, next) {

    // Intercept SystemJS requests based on accept header
    var accept = req.get('accept');
    if (accept && accept.indexOf('application/x-es-module') !== -1) {

      var fileName = Path.join(fromFileURL(builder.loader.baseURL), req.path);

      // TODO:
      (options.compileOnly ? builder.compile : builder.bundle).call(builder, fileName)
        .then(function (result) {
          // builder cache invalidation based on file watching
          if (options.fileWatch) {
            var filesToWatch = options.compileOnly ? [fileName] : result.modules.map(function(moduleName) {
            return result.tree[moduleName].path;
          });

            watchFiles(filesToWatch);
          }

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
