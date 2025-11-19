/**
 * Patch the CommonJS loader so that if the `debug` package is ever resolved as
 * an object (for example due to an ESM wrapper) we still hand nodemon the
 * callable default export it expects.
 */
const Module = require('module');

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  const exported = originalLoad.apply(this, arguments);

  if (request === 'debug' && exported && typeof exported !== 'function') {
    const maybeFn = exported.default;

    if (typeof maybeFn === 'function') {
      const patched = maybeFn;

      for (const key of Object.keys(exported)) {
        if (key === 'default') continue;
        if (!(key in patched)) {
          patched[key] = exported[key];
        }
      }

      return patched;
    }
  }

  return exported;
};

const nodemonBin = require.resolve('nodemon/bin/nodemon.js');
const nodeBin = process.argv[0];
const userArgs = process.argv.slice(2);

if (userArgs.length === 0) {
  userArgs.push('index.js');
}

process.argv = [nodeBin, nodemonBin, ...userArgs];

require(nodemonBin);
