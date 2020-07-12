'use strict';
const fs = require('fs');
const { join, resolve } = require('path');
const config = require('./config.json');
const manifestFile = require('./manifest.json');
const {
  convertToRelative,
  mkdir,
  stat,
  readdirRecursive,
  unlinkRecursive,
  copyFile
} = require('./async-fs');
const readlineSync = require('readline-sync');

const CONFIG_RUN_SELECTION = [];

// Get command line arguments:
for (const arg of process.argv) {
  if (arg.toLowerCase() === '-t') // Test
    process.env.TEST = true;
  if (arg.toLowerCase() === '-s') { // Select
    let input = 0;
    while (input > 0 || !CONFIG_RUN_SELECTION.length) {
      console.clear();
      console.log('Selected:', CONFIG_RUN_SELECTION);
      const selection = [
        'RUN',
        ...config
          .filter(({ active, repoName }) => {
            return active && !CONFIG_RUN_SELECTION.includes(repoName)
          })
          .map(({ repoName }) => repoName)
      ];
      input = readlineSync.keyInSelect(selection, 'Which config to run?');
      if (input === -1) {
        console.log('Aborting...');
        return;
      } else if (input > 0) {
        CONFIG_RUN_SELECTION.push(selection[input]);
      }
    }
  }
}

if (process.env.TEST)
  console.log(' * Running in TEST mode');

async function directoryFunc (dir, root, otherRoot, manifest) {
  if (dir === root)
    return;
  const otherDir = join(otherRoot, convertToRelative(dir, root));

  const dirIsDeleted = manifest[root] && // A check to see if initialising for the first time
    ((manifest[dir] === false && !fs.existsSync(dir)) ||
    (manifest[otherDir] === false && !fs.existsSync(otherDir)))

  if (dirIsDeleted) {
    await unlinkRecursive(dir);
    await unlinkRecursive(otherDir);
    manifest[dir] = manifest[otherDir] = false;
  // If the directory at path doesn't exists then make it:
  } else if (!fs.existsSync(otherDir)) {
    await mkdir(otherDir, manifest);
    manifest[dir] = true;
  }
}

async function fileFunc (file, root, otherRoot, manifest) {
  const otherFile = join(otherRoot, convertToRelative(file, root));

  const fileIsDeleted = manifest[root] && // A check to see if initialising
    ((manifest[file] === false && !fs.existsSync(file)) ||
    (manifest[otherFile] === false && !fs.existsSync(otherFile)));

  if (fileIsDeleted) {
    await unlinkRecursive(file);
    await unlinkRecursive(otherFile);
    manifest[file] = manifest[otherFile] === false;
  } else if (!fs.existsSync(otherFile))
    await copyFile(file, otherFile, manifest);
  else {
    const stats = await stat(file);
    const otherStats = await stat(otherFile);
    // Compare stat modified times:
    if (stats.mtimeMs > otherStats.mtimeMs)
      await copyFile(file, otherFile, manifest);
    else if (stats.mtimeMs < otherStats.mtimeMs)
      await copyFile(otherFile, file, manifest);
  }
}

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

function updateManifest (manifest, ignoreRegex) {
  for (const path in manifest) {
    if (manifest[path] === false || ignoreRegex.test(manifest[path]))
      delete manifest[path]; // Remove old deleted flagged paths or if it's being ignored
    else if (!fs.existsSync(path))
      manifest[path] = false; // Flag as deleted.
  }
}

(async () => {
  await Promise.all(config.map(async ({ cloudDirPath, localDirPath, repoName, ignore, active }) => {
    if (!active || (CONFIG_RUN_SELECTION.length && !CONFIG_RUN_SELECTION.includes(repoName)))
      return;
    console.log(`Syncing ${repoName}`);
    console.time(repoName);

    let manifest;
    if (!manifestFile[repoName])
      manifest = manifestFile[repoName] = {};
    else
      manifest = manifestFile[repoName];

    ignore = parseRegExp(ignore);

    cloudDirPath = cloudDirPath.replace(/\//g, '\\');
    localDirPath = localDirPath.replace(/\//g, '\\');
    if (!fs.existsSync(cloudDirPath))
      await mkdir(cloudDirPath, manifest);
    if (!fs.existsSync(localDirPath))
      await mkdir(localDirPath, manifest);

    const cloud = await readdirRecursive(cloudDirPath, ignore);
    const local = await readdirRecursive(localDirPath, ignore);

    updateManifest(manifest, ignore);

    for (const dir of cloud.dirs)
      await directoryFunc(dir, cloudDirPath, localDirPath, manifest);
    for (const dir of local.dirs)
      await directoryFunc(dir, localDirPath, cloudDirPath, manifest);

    for (const file of cloud.files)
      await fileFunc(file, cloudDirPath, localDirPath, manifest);
    for (const file of local.files)
      await fileFunc(file, localDirPath, cloudDirPath, manifest);

    updateManifest(manifest, ignore);
    manifest[cloudDirPath] = manifest[localDirPath] = true;

    console.timeEnd(repoName);
  }));

  // Overwrite manifest file:
  if (!process.env.TEST) {
    fs.writeFileSync('./manifest.json', JSON.stringify(manifestFile, null, 2));
    console.log('Saved manifest.json');
  }
})();
