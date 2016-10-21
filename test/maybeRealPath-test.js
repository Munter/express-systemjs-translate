var path = require('path');
var proxyquire = require('proxyquire');
var expect = require('unexpected')
  .clone()
  .addAssertion('<string> to resolve to <string>', function (expect, subject, value) {
    return expect(subject, 'to equal', value);
  });
var maybeRealPath = require('../lib/maybeRealPath');

function fixturesPath(name) {
  return path.resolve(__dirname, '../fixtures/maybeRealPath', name);
}

describe('maybeRealPath', function () {
  it('should return the original path to an existing file', function () {
    return expect(maybeRealPath(fixturesPath('file.txt')), 'to resolve to', fixturesPath('file.txt'));
  });
  it('should resolve a symlink to the original path', function () {
    return expect(maybeRealPath(fixturesPath('symlink.txt')), 'to resolve to', fixturesPath('file.txt'));
  });
  it('should return the path to the symlink when resolving a broken symlink', function () {
    return expect(maybeRealPath(fixturesPath('brokenSymlink.txt')), 'to resolve to', fixturesPath('brokenSymlink.txt'));
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
