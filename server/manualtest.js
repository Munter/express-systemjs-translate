var express = require('express');
var translate = require('../lib/index');

var app = express()
  .use(translate('fixtures', {
    debug: true
  }))
  .use(express.static('fixtures'));

app.listen(3000);
