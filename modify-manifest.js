'use strict';
const fs = require('fs');
const manifest = require('./manifest.json');
const config = require('./config.json');
const { readdirRecursive } = require('./async-fs');

/**
 * @param {string} str
 * @returns {RegExp} Returns the regexString parameter parsed as an instance of RegExp.
 */
function parseRegExp (str) {
  if (!str)
    return /(?=a)b/; // This RegExp always returns false.
  const flags = str.substring(str.lastIndexOf('/') + 1);
  const source = str.substring(1, str.lastIndexOf('/'));
  return new RegExp(source, flags);
}

(async () => {
  for (const repoName in manifest) {
    const { cloudDirPath, localDirPath, ignore } = config.find(c => c.repoName === repoName);
    let paths = [];
    const { files, dirs } = await readdirRecursive(cloudDirPath, parseRegExp(ignore));
    paths.push(...files, ...dirs);
    const { files: files2, dirs: dirs2 } = await readdirRecursive(localDirPath, parseRegExp(ignore));
    paths.push(...files2, ...dirs2);
    for (const path of paths) {
      manifest[repoName][path] = true;
    }
  }
  fs.writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2));
})();
