express-systemjs-translate
==========================

[![NPM version](https://badge.fury.io/js/express-systemjs-translate.svg)](http://badge.fury.io/js/express-systemjs-translate)
[![Build Status](https://travis-ci.org/Munter/express-systemjs-translate.svg?branch=master)](https://travis-ci.org/Munter/express-systemjs-translate)
[![Coverage Status](https://img.shields.io/coveralls/Munter/express-systemjs-translate.svg)](https://coveralls.io/r/Munter/express-systemjs-translate?branch=master)
[![Dependency Status](https://david-dm.org/Munter/express-systemjs-translate.svg)](https://david-dm.org/Munter/express-systemjs-translate)

Express middleware to speed up systemjs development loads by running translations serverside.

Usage
-----

You can use express-systemjs-translate with either [jspm]() or [systemjs.builder](). The configuration with jspm is simpler, since `baseUrl` the path to your systemjs configuration are implicit.

**Example usage with JSPM:**

```javascript
var express = require('express');
var translate = require('express-systemjs-translate');

var app = express()
  .use(translate())
  .use(express.static('path/to/webroot'));
```

**Example usage with systemjs-builder:**

```javascript
var express = require('express');
var translate = require('express-systemjs-translate');

var app = express()
  .use(translate({
    baseUrl: 'path/to/webroot',
    configFile: 'relative/path/from/baseUrl/to/config.js'
  }))
  .use(express.static('path/to/webroot'));
```


License
-------
(The MIT License)

Copyright (c) 2015 Peter Müller <munter@fumle.dk>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
