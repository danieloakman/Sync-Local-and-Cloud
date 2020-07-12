'use strict';
const archiver = require('archiver');
const unzipper = require('unzipper');
const fs = require('fs');
const { join } = require('path');
const { readdirRecursive, convertToRelative } = require('./async-fs');

module.exports.zipDir = (src, dest, ignoreRegex = null) => {
  const start = new Date();
  console.log(`Started zipping: "${dest}"`);
  return new Promise(async resolve => {
    const archive = archiver('zip', { zlib: { level: 5, memLevel: 9 }})
      .on('warning', err => {
        if (err.code === 'ENOENT')
          console.error(err);
        else
          throw err;
      })
      .on('error', err => {
        throw err;
      });
      // .on('progress', progress => {
      //   console.log(
      //     `progress: ${((progress.entries.processed / progress.entries.total) * 100).toFixed(2)}%`
      //   );
      // });
    const output = fs.createWriteStream(dest)
      .on('close', () => {
        console.log(
          `Finished zipping: "${dest}" in ${(new Date() - start) / 1e3} seconds. ` +
          `${(archive.pointer() / 1e6).toFixed(2)} total MB zipped.`
        );
        resolve();
      });

    archive.pipe(output);
    if (!ignoreRegex)
      archive.directory(src, false);
    else if (ignoreRegex instanceof RegExp) {
      const { files } = await readdirRecursive(src, ignoreRegex);
      for (const file of files)
        if (!ignoreRegex.test(file))
          archive.file(file, { name: convertToRelative(file, src) });
    } else
      throw new Error('ignoreRegex parameter isn\'t a regular expression.'); 
    archive.finalize();
  });
};

module.exports.unzipDir = async (src, dest, ignoreRegex = null) => {
  console.log(`Started unzipping: "${dest}"`);
  const start = new Date();
  if (!fs.existsSync(dest))
    fs.mkdirSync(dest);
  return new Promise(async resolve => {
    fs.createReadStream(src)
      .pipe(unzipper.Parse())
      .on('entry', async entry => {
        const path = entry.path;
        const fullPath = join(dest, path);
        const type = entry.type; // 'Directory' or 'File'
        // const size = entry.vars.uncompressedSize; // There is also compressedSize;
        // const buffer = await entry.buffer();
        if (type === 'Directory')
          fs.mkdirSync(fullPath);
        else if (!ignoreRegex || (ignoreRegex instanceof RegExp && !ignoreRegex.test(fullPath)))
          entry.pipe(fs.createWriteStream(fullPath));
        else
          entry.autodrain();
      })
      .on('close', () => {
        console.log(`Finished unzipping: "${dest}" in ${(new Date() - start) / 1e3} seconds`);
        resolve();
      });
  });
};
