var _ = require('lodash');

var leakedGlobals = {};
module.exports = function wrapLeaky(fn) {
  var globalSnapshot = _.extend({}, global);
  _.extend(global, leakedGlobals);
  function cleanUp() {
    _.difference(Object.keys(global), Object.keys(globalSnapshot)).forEach(function (leakedKey) {
      leakedGlobals[leakedKey] = global[leakedKey];
      delete global[leakedKey];
    });
  }
  var returnValue;
  try {
    returnValue = fn();
  } catch (e) {
    cleanUp();
    throw e;
  }
  if (returnValue && typeof returnValue.then === 'function') {
    return returnValue.then(function (result) {
      cleanUp();
      return result;
    }, function (err) {
      cleanUp();
      throw err;
    });
  } else {
    cleanUp();
  }
};
