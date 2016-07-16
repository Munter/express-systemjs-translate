'use strict';

module.exports = function getTimer() {
  var before = Date.now();

  return function time() {
    var now = Date.now();
    var diff = now - before;

    before = now;

    return (diff / 1000).toFixed(3);
  };
};
