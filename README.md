express-systemjs-translate
==========================

[![NPM version](https://badge.fury.io/js/express-systemjs-translate.svg)](http://badge.fury.io/js/express-systemjs-translate)
[![Build Status](https://travis-ci.org/Munter/express-systemjs-translate.svg?branch=master)](https://travis-ci.org/Munter/express-systemjs-translate)
[![Coverage Status](https://img.shields.io/coveralls/Munter/express-systemjs-translate.svg)](https://coveralls.io/r/Munter/express-systemjs-translate?branch=master)
[![Dependency Status](https://david-dm.org/Munter/express-systemjs-translate.svg)](https://david-dm.org/Munter/express-systemjs-translate)

Express middleware to speed up systemjs development loads by running translations serverside.

This middleware will intercept requests for JavaScript modules, identified by an `application/x-es-module` accept-header that SystemJS always provides.
When intercepting a module request the middleware will bundle the module with all its dependencies on the fly, using any available version of jspm or systemjs-builder in your project. Translating and bundling reduces the time spent in the browser on incremental discovery of modules, amout of roundtrips, heavy uncacheable translation operations and so forth.

Initial loads are running at the speed of a serverside bundling operation. Incremental rebuilds when one or more files have changed correctly leverage the SystemJS builders cache, making incremental changes even faster to load

Projects with 1000+ modules, taking ~60 seconds for a full load with browser-only loading and translation, are known to reduce to 4 seconds build time on initial load and 2 second build time on incremental rebuilds and loads.


Usage
-----

You can use express-systemjs-translate with either [jspm](https://www.npmjs.com/package/jspm) or [systemjs-builder](https://www.npmjs.com/package/systemjs-builder). The configuration with jspm is simpler, since `baseUrl` and `configFile` are implicit.

This middleware will only handle requests to javascript modules, so it is recommended to have different middleware handling static file requests further down the middleware stack. [express.static](http://expressjs.com/en/starter/static-files.html) serves this purpose very well.

**Example usage with JSPM:**

```javascript
var express = require('express');
var translate = require('express-systemjs-translate');

var app = express()
  .use(translate('path/to/webroot'))
  .use(express.static('path/to/webroot'));

app.listen(3000);
```

**Example usage with systemjs-builder:**

```javascript
var express = require('express');
var translate = require('express-systemjs-translate');

var app = express()
  .use(translate('path/to/webroot', {
    baseUrl: 'path/to/systemjs/baseURL',
    configFile: 'relative/path/from/baseUrl/to/config.js'
  }))
  .use(express.static('path/to/webroot'));

app.listen(3000);
```

The `configFile` property can also be specified as an array of strings, which
will be loaded as configuration files in the given order.

This is useful if your configuration is spread across multiple `System.config`
calls in different scripts.


SystemJS Configuration
----------------------

In order to make the middleware work correctly a few SystemJS configurations are essential.

You need the [`defaultJSExtensions`](https://github.com/systemjs/systemjs/blob/master/docs/config-api.md#defaultjsextensions) setting to be `false`. This is default from SystemJS 0.17 and above. If this setting is missing you are likely to encounter issues with wrong file name resolving.

You need to configure loader plugin patterns matches in your configuration rather than using the plugin syntax inline (eg. `System.import('path/to/template.tpl!tpl')`). Instead you need to configure your `meta` section to apply your desired loader on the specific module patterns you need.

An SystemJS configuration following these rules could look like this:

```js
System.config({
  defaultJsExtensions: false, // Only needed in SystemJS 0.16 and below

  meta: {
    '/**/*.tpl': { loader: 'tpl' },
    '/**/*.css': { loader: 'css' }
  }
});
```

Middleware Configuration
------------------------

The translate middleware takes a few options to adapt to your project setup. This is the full configuration API:

```js
var translate = require('express-systemjs-translate');

// REQUIRED: First argument is your web server root
// This should be identical to the root you give any static middleware down the chain

var middleware = translate('path/to/webroot', {
  // SystemJS baseURL.
  // Only needed if you are using systemjs-builder directly
  // If you use jspm the configuration will be automatic
  // Defaults to value of server root argument if not provided
  baseUrl: 'path/to/webroot',

  // Path to SystemJS config file.
  // Only needed if you are using systemjs-builder directly
  // If you use jspm the configuration will be automatic
  // Defaults to `system.config.js` in your server root argument if not provided
  configFile: 'path/to/webroot/system.config.js',

  // Bundle module dependencies.
  // Dependencies will be translated and prepended to the response
  // Bundling is significantly faster than only compiling the individual module
  // Defaults to `true`
  bundle: true,

  // Watch served files for changes
  // This will speed up incremental rebuilds by only doing work on files known to have changed
  // Defaults to `true`
  watchFiles: true,

  // Enable logging for debugging purposes
  debug: false,

  // Build flags that will be passed on to systemjs-builder.
  // These are only needed if any of your plugins require options
  buildFlags: {
    sourceMaps: true
  }
});
```

Thanks
------

This middleware has been written in close collaboration with:

- [Guy Bedford](https://github.com/guybedford)
- [Gustav Nikolaj](https://github.com/gustavnikolaj)
- [Andreas Lind](https://github.com/papandreou)


License
-------
(The MIT License)

Copyright (c) 2015 Peter Müller <munter@fumle.dk>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
