'use strict';

var extend = require('extend');
var Path = require('path');
var fs = require('fs');
var Gaze = require('gaze').Gaze;
var chalk = require('chalk');
var difference = require('lodash.difference');

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

function log(message) {
  console.error('express-systemjs-translate: %s', message);
}


module.exports = function (options) {
  var builder;
  var depCache = {};

  options = extend({
    serverRoot: process.cwd(),
    baseUrl: process.cwd(),
    configFile: 'system.config.js',
    bundle: true,
    watchFiles: true,
    debug: false,
    depCache: false,
    buildFlags: {}
  }, options || {});

  options.buildFlags = extend({
    dev: true,
    normalize: true
  }, options.buildFlags);

  if (options.depCache) {
    log(chalk.yellow('WARNING! You are using the `depCache` option. This will most likely slow down your load performance considerably'));
  }

  var absoluteConfigUrl;

  try {
    // Bet on JSPM first. Config is automatic
    Builder = require('jspm').Builder;

    builder = new Builder();

    absoluteConfigUrl = require('jspm/lib/config').pjson.configFile;
  } catch (err) {
    // JSPM not installed. Lets try systemjs-builder
    try {
      Builder = require('systemjs-builder');

      absoluteConfigUrl = Path.resolve(options.baseUrl, options.configFile);
      builder = new Builder(options.baseUrl, absoluteConfigUrl);
    } catch (err) {
      throw err;
    }
  }

  builder.config({
    rootURL: options.serverRoot
  });

  var rootRelativeConfigUrl = Path.relative(options.serverRoot, absoluteConfigUrl);

  if (options.watchFiles) {
    var fileWatcher = new Gaze('', {
        debounceDelay: 1
    });

    var watchFiles = function watchFiles(files) {
      if (!Array.isArray(files)) {
        return;
      }

      var patternsBefore = fileWatcher._patterns;
      fileWatcher.add(files, function (error) {
        if (options.debug) {
          if (error) {
            log(chalk.red('Error setting up file watches'));
            log(chalk.red(error));
            return;
          }

          var patternsDiff = difference(fileWatcher._patterns, patternsBefore);

          if (patternsDiff.length > 0) {
            log('Watching modules:\n\t', patternsDiff.join('\n\t'));
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
        if (options.debug) {
          log('File removed: ' + path);
        }
        return;
      }

      if (event === 'changed') {
        builder.invalidate(path);
        if (options.debug) {
          log('File changed: ' + path);
        }
      }
    });
  }

  return function (req, res, next) {
    // Intercept requests for the SystemJS config file to augment is with depCache information
    if (options.depCache) {
      if (req.path === ('/' + rootRelativeConfigUrl)) {
        fs.readFile(absoluteConfigUrl, 'utf8', function (err, configString) {
          var response = [
            configString,
            'SystemJS.config({ depCache: ' + JSON.stringify(depCache) + ' })'
          ].join('\n\n');

          res.set({
            'Content-Type': 'application/javascript; charset=UTF-8'
          });
          res.end(response);
        });

        return;
      }
    }

    // Intercept SystemJS requests based on accept header
    var accept = req.get('accept');
    if (accept && accept.indexOf('application/x-es-module') !== -1) {

      var baseURLPath = fromFileURL(builder.loader.baseURL);

      var fileName = Path.join(baseURLPath, req.path);

      if (!options.watchFiles) {
        // Invalidate all builder caches
        // This makes the build slower as all files in the build need to be stat'ed
        builder.invalidate('*');
      }

      // Decide wether to fully bundle or only only compile the module.
      (options.bundle ? builder.bundle : builder.compile).call(builder, fileName, options.buildFlags)
        .then(function (result) {
          // builder cache invalidation based on file watching
          if (options.watchFiles) {
            var filesToWatch = !options.bundle ? [fileName] : result.modules.map(function(moduleName) {
              return Path.join(baseURLPath, result.tree[moduleName].path);
            });

            watchFiles(filesToWatch);
          }

          if (options.depCache) {
            // Resolve the known modules depCache and keep the knowledge around
            if (!result.tree) {
              builder.trace(fileName)
                .then(function (tree) {
                  depCache = extend(depCache, builder.getDepCache(tree));
                });
            }
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
          err.stack = err.message;
          next(err);
        });

      return;
    }

    next();
  };
};
