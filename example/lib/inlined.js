System.registerDynamic("lib/stringExport.js", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = 'foo';
  return module.exports;
});

System.registerDynamic("lib/inlined.js", ["lib/stringExport.js"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var foo = $__require('lib/stringExport.js');
  module.exports = {foo: foo};
  return module.exports;
});

// sourceMappingURL=data:application/json;base64,ewogICAgInZlcnNpb24iOiAzLAogICAgInNvdXJjZXMiOiBbCiAgICAgICAgImxpYi9zdHJpbmdFeHBvcnQuanMiLAogICAgICAgICJsaWIvaW5saW5lZC5qcyIKICAgIF0sCiAgICAibmFtZXMiOiBbXSwKICAgICJtYXBwaW5ncyI6ICI7O0FBQ0k7QUFBWTtBQUFlOzs7QUFEaUY7Ozs7QUNDNUc7QUFBWTtBQUFlOzs7O0FBRHdHIiwKICAgICJmaWxlIjogIm91dHB1dC5qcyIsCiAgICAic291cmNlUm9vdCI6ICIvIiwKICAgICJzb3VyY2VzQ29udGVudCI6IFsKICAgICAgICAibW9kdWxlLmV4cG9ydHMgPSAnZm9vJztcbiIsCiAgICAgICAgInZhciBmb28gPSByZXF1aXJlKCcuL3N0cmluZ0V4cG9ydCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZm9vOiBmb29cbn07XG4iCiAgICBdCn0K
