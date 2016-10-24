var path = require('path');
var proxyquire = require('proxyquire');

function fixturesPath(name) {
  return path.resolve(__dirname, '../fixtures/maybeRealPath', name);
}


var expect = require('unexpected')
  .clone()
  .addAssertion('<string> to resolve to <string>', function (expect, subject, value) {
    return expect(maybeRealPath(fixturesPath(subject)), 'to equal', fixturesPath(value));
  });
var maybeRealPath = require('../lib/maybeRealPath');


describe('maybeRealPath', function () {
  it('should return the original path to an existing file', function () {
    return expect('file.txt', 'to resolve to', 'file.txt');
  });
  it('should resolve a symlink to the original path', function () {
    return expect('symlink.txt', 'to resolve to', 'file.txt');
  });
  it('should return the path to the symlink when resolving a broken symlink', function () {
    return expect('brokenSymlink.txt', 'to resolve to', 'brokenSymlink.txt');
  });
  it('should swallow ENOENT exceptions and return the input instead', function () {
    var maybeRealPath = proxyquire('../lib/maybeRealPath', {
      fs: {
        realpathSync: function () {
          var err = new Error();
          err.code = 'ENOENT';
          throw err;
        }
      }
    });
    return expect(maybeRealPath('foobar'), 'to equal', 'foobar');
  });
  it('should not swallow exceptions other than ENOENT', function () {
    var maybeRealPath = proxyquire('../lib/maybeRealPath', {
      fs: {
        realpathSync: function () {
          throw new Error('FOOBAR');
        }
      }
    });
    return expect(function () {
      maybeRealPath('foobar');
    }, 'to throw', 'FOOBAR');
  });
});
