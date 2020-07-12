'use strict';
const fs = require('fs');
const { join } = require('path');
// const manifest = require('./manifest.json');
const config = require('./config.json');
const { unlinkRecursive } = require('./async-fs');

// const newManifest = {};
// config.forEach(({ repoName }) => {
//   newManifest[repoName] = {};
// });
// for (const path in manifest) {
//   for (const c of config) {
//     if (path.includes(c.cloudDirPath) || path.includes(c.localDirPath)) {
//       newManifest[c.repoName][path] = true;
//       break;
//     }
//   }
// }

// fs.writeFileSync('./manifest.json', JSON.stringify(newManifest, null, 2));

// function update (obj) {
//     obj['5'] = 5;
// }

// const obj = {
//     a: { '1': 1, '2': 2, '3': 3 },
// };
// const o = obj.a;
// o['1'] = 15;
// update(o);
// console.log(obj);

// const a = fs.statSync("C:\\Users\\doakm\\Google Drive\\CodeRepos\\Personal\\Sync-Cloud-and-Local");
// console.log();

// const archiver = require('archiver');

// function zipDir (dir, dest) {
//   console.time(`zipping "${dir}" to "${dest}"`);
//   return new Promise(resolve => {
//     const archive = archiver('zip', {
//         zlib: { level: 9 }
//     });

//     const output = fs.createWriteStream(dest);

//     output.on('close', function() {
//       console.log((archive.pointer() / 1e6).toFixed(2) + ' total MB');
//       console.log('archiver has been finalized and the output file descriptor has closed.');
//       console.timeEnd(`zipping "${dir}" to "${dest}"`);
//       resolve();
//     });
//     output.on('end', function() {
//       console.log('Data has been drained');
//     });

//     archive.on('warning', function(err) {
//       if (err.code === 'ENOENT')
//         console.error(err);
//       else
//         throw err;
//     });
//     archive.on('error', function(err) {
//       throw err;
//     });
//     archive.on('progress', progress => {
//       console.log(`progress: ${((progress.entries.processed / progress.entries.total) * 100).toFixed(2)}%`);
//     });
//     // archive.on('close', () => {
//     //   console.log('closing archive');
//     //   output.close();
//     // });

//     archive.pipe(output);
//     archive.directory(dir, false);
//     archive.finalize();
//   });
// }

// const unzipper = require('unzipper')

// async function unzipDir (src, dest) {
//   return new Promise(resolve => {
//     fs.createReadStream(src)
//       .pipe(unzipper.Parse())
//       .on('entry', async entry => {
//         const path = entry.path;
//         const type = entry.type; // 'Directory' or 'File'
//         const size = entry.vars.uncompressedSize; // There is also compressedSize;
//         // const buffer = await entry.buffer();
//         if (type === 'Directory')
//           fs.mkdirSync(join(dest, path));
//         else 
//           entry.pipe(fs.createWriteStream(join(dest, path)));
//         // if (fileName === "this IS the file I'm looking for") {
//         //   console.log('');
//         //   // entry.pipe(fs.createWriteStream('output/path'));
//         // } else {
//         //   entry.autodrain();
//         // }
//       })
//       .on('close', () => {
//         console.log(`Unzipped "${src}" to ${dest}`);
//         resolve();
//       });
//   });
// }

(async () => {
  const { zipDir, unzipDir } = require('./zip-util')
  if (fs.existsSync('./test.zip'))
    fs.unlinkSync('./test.zip')
  await zipDir(config[0].cloudDirPath, './test.zip', /\.git/i);
  if (fs.existsSync('./test'))
    await unlinkRecursive('./test');
  await unzipDir('./test.zip', './test');
})();

console.log(1);