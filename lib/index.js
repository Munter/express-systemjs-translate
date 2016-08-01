'use strict';

var getTimer = require('./timer');
var extend = require('extend');
var Path = require('path');
var fs = require('fs');
var Gaze = require('gaze').Gaze;
var chalk = require('chalk');
var difference = require('lodash.difference');
var inlineSourcemapComment = require('inline-source-map-comment');

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

function polyFillBrowserSync(req, res) {
  if (!req.path) {
    req.path = req.url;
  }

  if (!req.get) {
    req.get = function getHeader(header) {
      return req.headers[header];
    };
  }

  if (!res.set) {
    res.set = function setHeaders(headerObj) {
      Object.keys(headerObj).forEach(function (header) {
        res.setHeader(header, headerObj[header]);
      });
    };
  }

  if (!res.send) {
    res.send = res.end;
  }
}

/**
 * Express SystemJS translation and bundling middleware factory
 * @param  {String} serverRoot path to static file serves webroot
 * @param  {Object} options    configuration options object
 * @return {Function}          middleware function compatible with connect, express, browser-sync
 */
module.exports = function systemJsTranslate(serverRoot, options) {
  if (typeof serverRoot !== 'string') {
    throw new Error('express-systemjs-translate: Missing first argument: serverRoot');
  }

  var builder;
  var depCache = {};

  options = extend({
    baseUrl: serverRoot,
    configFile: Path.join(serverRoot, 'system.config.js'),
    bundle: true,
    watchFiles: true,
    debug: false,
    depCache: false,
    buildFlags: {}
  }, options || {});

  options.buildFlags = extend({
    dev: true,
    normalize: false,
    sourceMaps: true
  }, options.buildFlags);

  function log() {
    if (options.debug) {
      var args = ['express-systemjs-translate:', chalk.yellow('DEBUG')].concat(Array.prototype.slice.call(arguments));
      console.error.apply(console, args);
    }
  }

  function promiseTimeLog(time, message) {
    return function (result) {
      log(time(), message);

      return result;
    };
  }

  if (options.depCache) {
    log(chalk.yellow('WARNING! You are using the `depCache` option. This will most likely slow down your load performance considerably'));
  }

  var absoluteConfigUrl;
  var hasJspm = false;

  try {
    // Bet on JSPM first. Config is automatic
    Builder = require('jspm').Builder;

    builder = new Builder();

    absoluteConfigUrl = require('jspm/lib/config').pjson.configFile;

    hasJspm = true;
  } catch (err) {
    // JSPM not installed. Lets try systemjs-builder
    try {
      Builder = require('systemjs-builder');

      absoluteConfigUrl = Path.resolve(process.cwd(), options.configFile);

      builder = new Builder(options.baseUrl, absoluteConfigUrl);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('express-systemjs-translate: jspm and systemjs-builder packages not found. You need at least one of these packages installed');
      }

      throw err;
    }
  }

  var absoluteServerRoot = Path.resolve(process.cwd(), serverRoot);
  var baseURLPath = fromFileURL(builder.loader.baseURL);
  var rootRelativeConfigUrl = Path.relative(absoluteServerRoot, absoluteConfigUrl);
  var rootRelativeBaseUrlPath = Path.relative(absoluteServerRoot, baseURLPath);

  if (rootRelativeBaseUrlPath.indexOf('..') === 0) {
    if (hasJspm) {
      throw new Error([
        'express-systemjs-translate: Configuration error. serverRoot is not a parent directory for your jspm configured baseUrl.',
        'serverRoot: ' + absoluteServerRoot,
        'baseUrl: ' + baseURLPath
      ].join('\n\t'));
    } else {
      throw new Error([
        'express-systemjs-translate: Configuration error. SystemJS baseURL must be within the serverRoot.',
        'serverRoot: ' + absoluteServerRoot,
        'baseUrl: ' + baseURLPath
      ].join('\n\t'));
    }
  }

  if (Path.relative(baseURLPath, absoluteConfigUrl).indexOf('..') === 0) {
    throw new Error([
      'express-systemjs-translate: Configuration error. SystemJS configuration file must be within the SystemJS baseURL.',
      'baseUrl: ' + baseURLPath,
      'configFile: ' + absoluteConfigUrl
    ].join('\n\t'));
  }

  builder.config({
    rootURL: absoluteServerRoot
  });

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
        fileWatcher.remove(path);

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

  function watchResults(options, fileName, result) {
    // builder cache invalidation based on file watching
    if (options.watchFiles) {
      var filesToWatch = !options.bundle ? [fileName] : result.modules.map(function(moduleName) {
        return Path.join(baseURLPath, result.tree[moduleName].path);
      });

      watchFiles(filesToWatch);
    }

    return result;
  }

  function depCacheResults(options, fileName, result) {
    // depCache feature only makes sense when not bundling
    if (options.depCache && !options.bundle) {
      // Resolve the known modules depCache and keep the knowledge around
      builder.trace(fileName)
        .then(function (tree) {
          depCache = extend(depCache, builder.getDepCache(tree));
        });
    }

    return result;
  }

  function upgradeSourceMaps(options, result) {
    // handle source maps
    if (result.sourceMap) {
      var map = JSON.parse(result.sourceMap);
      map.file = map.sources.slice().pop();

      // Set sourceRoot to the path of the SystemJS baseURL. Helps browsers resolve source urls
      if (rootRelativeBaseUrlPath) {
        map.sourceRoot = '/' + rootRelativeBaseUrlPath + '/';
      } else {
        map.sourceRoot = '/';
      }

      // If source maps have not been built with content inlined
      if (!map.sourcesContent) {
        // Set sourcesContent to null to make the browser request the source directly from server
        // Array of nulls for each dependency of the requested file
        map.sourcesContent = (new Array(map.sources.length - 1)).fill(null);

        // Set sourcesContent of originally requested file because the browser won't re-request the source file
        // Append the source of the requested file to the array
        if (result.tree) {
          var trace = result.tree[map.file];

          if (!trace) {
            trace = result.tree[result.entryPoints.slice().pop()];
          }

          map.sourcesContent.push(trace.source);
        }
      }

      // Base64 inline sourcemap
      result.source += '\n' + inlineSourcemapComment(map, { sourcesContent: true }) + '\n';

      if(options.debug) {
        var prettyMap = JSON.stringify(map, undefined, 4);
        // log(map.file, 'source map', prettyMap);
        log(map.file, 'source map inlined');
        result.source += '\n/* DEBUG: ' + map.file + ' source map:\n' + prettyMap.replace(/\*\//g, '*\\/') + '\n*/\n';
      }
    }

    return result;
  }

  return function (req, res, next) {
    var time = getTimer();

    if (typeof req.path === 'undefined') {
      polyFillBrowserSync(req, res);
      log(time(), 'Polyfill browsersync request and response object');
    }

    // Intercept requests for the SystemJS config file to augment is with depCache information
    if (options.depCache) {
      if (req.path === ('/' + rootRelativeConfigUrl)) {
        fs.readFile(absoluteConfigUrl, 'utf8', function (err, configString) {
          var response = [
            configString,
            'SystemJS.config({ depCache: ' + JSON.stringify(depCache, undefined, 2) + ' })'
          ].join('\n\n');

          res.set({
            'Content-Type': 'application/javascript; charset=UTF-8'
          });
          res.end(response);

          log(time(), 'Serve depCache augmented SystemJS config file');
        });

        return;
      }
    }

    // Intercept SystemJS requests based on accept header
    var accept = req.get('accept');
    if (accept && accept.indexOf('application/x-es-module') !== -1) {
      var fileName = Path.join(absoluteServerRoot, req.path);

      if (!options.watchFiles) {
        // Invalidate all builder caches
        // This makes the build slower as all files in the build need to be stat'ed
        builder.invalidate('*');

        log(time(), 'Invalidate builder cache');
      }

      // Decide wether to fully bundle or only only compile the module.
      var builderPromise;

      if (options.bundle) {
        builderPromise = builder.bundle(fileName, options.buildFlags);
      } else {
        // If source maps are wanted, also put in source files content
        builderPromise = builder.compile(fileName, extend(options.buildFlags, { sourceMapContents: !!options.sourceMap }));
      }

      builderPromise
        .then(promiseTimeLog(time, 'systemjs-builder'))

        .then(watchResults.bind(null, options, fileName))
        .then(promiseTimeLog(time, 'watch requested files'))

        .then(depCacheResults.bind(null, options, fileName))
        .then(promiseTimeLog(time, 'store depCache information'))

        .then(upgradeSourceMaps.bind(null, options))
        .then(promiseTimeLog(time, 'upgrade source maps'))

        .then(function (result) {

          res.set({
            'Content-Type': 'application/javascript; charset=UTF-8'
          });
          res.send(result.source);

        })
        .then(promiseTimeLog(time, 'serve', fileName))

        .catch(function (err) {
          err.message = 'express-systemjs-translate: ' + err.message;
          err.statusCode = 500;
          // err.stack = err.message + err.stack;
          next(err);
        });

      return;
    }

    next();
  };
};
