var fs = require('fs');

module.exports = function maybeRealPath(path) {
  try {
    return fs.realpathSync(path);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return path;
    }
    throw e;
  }
};
