'use strict';
const fs = require('fs');
const { join } = require('path');

/** Async wrapper for fs.stat() */
module.exports.stat = path => {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) reject(err);
      resolve(stats);
    });
  });
};

/** Async wrapper for fs.readdir() */
module.exports.readdir = path => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });
};

/**
 * Async wrapper for fs.copyFile()
 * @param {string} src
 * @param {string} dest
 */
module.exports.copyFile = (src, dest, manifest) => {
  console.log(` + "${dest}"`);
  return new Promise(resolve => {
    if (process.env.TEST) {
      manifest[src] = manifest[dest] = true;
      resolve();
    } else
      fs.copyFile(src, dest, err => {
        if (typeof err.code === 'string' && err.code === 'EPERM') {
          fs.chmodSync(src, 0o765);
          fs.chmodSync(dest, 0o765);
          fs.copyFileSync(src, dest);
        } else if (err)
          console.error(err);
        manifest[src] = manifest[dest] = true;
        resolve();
      });
  });
};

/** Async wrapper for fs.mkdir() */
module.exports.mkdir = (path, manifest) => {
  console.log(` + "${path}"`);
  return new Promise(resolve => {
    if (process.env.TEST) {
      manifest[path] = true;
      resolve();
    } else
      fs.mkdir(path, err => {
        if (err) console.error(err);
        manifest[path] = true;
        resolve();
      });
  });
};

/**
 * Recursively reads directories.
 * @param {stirng} dir
 * @param {RegExp} ignoreRegex
 * @returns {{ files: string[], dirs: string[] }} Returns all files and directories and their paths
 * found inside of dir.
 */
module.exports.readdirRecursive = async (dir, ignoreRegex = /(?=a)b/) => {
  if (ignoreRegex.test(dir) || !fs.existsSync(dir))
    return { files: [], dirs: [] };
  const stats = await module.exports.stat(dir);
  if (stats.isFile())
    return { files: [dir], dirs: [] };
  if (stats.isDirectory()) {
    const files = [];
    const dirs = [dir];
    const fileOrDirs = await module.exports.readdir(dir);
    for (const fileOrDir of fileOrDirs) {
      const {
        files: newFiles,
        dirs: newDirs
      } = await module.exports.readdirRecursive(join(dir, fileOrDir), ignoreRegex);
      files.push(...newFiles);
      dirs.push(...newDirs);
    }
    return { files, dirs };
  }
};

/** Async and recursive wrapper for fs.unlink() */
module.exports.unlinkRecursive = async path => {
  const deletePath = (path, isFile) => {
    console.log(` - "${path}"`);
    if (!process.env.TEST)
      return new Promise(resolve => {
        if (isFile)
          fs.unlink(path, err => {
            if (err) console.error(err);
            resolve();
          });
        else
          fs.rmdir(path, err => {
            if (err) console.error(err);
            resolve();
          });
      });
  };

  const { files, dirs } = await module.exports.readdirRecursive(path);
  for (const path of [...files, ...dirs])
    await deletePath(path, (await module.exports.stat(path)).isFile());
};

module.exports.convertToRelative = (path, root) => {
  return path
    .replace(/\//g, '\\')
    .replace(root + '\\', '');
};
