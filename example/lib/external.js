System.registerDynamic("lib/stringExport.js", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = 'foo';
  return module.exports;
});

System.registerDynamic("lib/external.js", ["lib/stringExport.js"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var foo = $__require('lib/stringExport.js');
  module.exports = {foo: foo};
  return module.exports;
});

//# sourceMappingURL=external.js.map
