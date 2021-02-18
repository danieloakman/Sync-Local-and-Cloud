'use strict';
const fs = require('fs');
const { join } = require('path');
const {
  convertToRelative,
  mkdir,
  stat,
  copyFile
} = require('./utils/file-util');
const readlineSync = require('readline-sync');
const { deleteDeep, walkdir } = require('more-node-fs');
const { ArgumentParser } = require('argparse');

// Get command line arguments:
const argparser = new ArgumentParser({ description: 'Sync-Local-and-Cloud' });
argparser.add_argument('config', {
  help: 'The path to the config JSON file.'
});
argparser.add_argument('manifest', {
  help: 'The path to the manifest JSON file.'
});
argparser.add_argument('-t', '--test', {
  default: false, action: 'store_true'
});
argparser.add_argument('-s', '--select', {
  default: false,
  type: arg => arg.toLowerCase().trim() === 'true'
});
argparser.add_argument('-a', '--action', {
  default: 'sync',
  type: arg => {
    arg = arg.toLowerCase().trim();
    if (!['sync', 'pull', 'push'].includes(arg)) {
      throw new Error('action parameter is invalid.');
    }
    return arg;
  }
});
const {
  config: configPath, manifest: manifestPath, select, action, test
} = argparser.parse_args();

const config = require(configPath);
const manifestFile = require(manifestPath);
const CONFIG_RUN_SELECTION = [];
if (test) {
  process.env.TEST = true;
  console.log(' * Running in TEST mode');
}
if (select) {
  let input = 0;
  while (input > 0 || !CONFIG_RUN_SELECTION.length) {
    console.clear();
    console.log('Selected:', CONFIG_RUN_SELECTION);
    const selection = [
      'RUN',
      ...config
        .filter(({ active, repoName }) => {
          return active && !CONFIG_RUN_SELECTION.includes(repoName);
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

async function directoryFunc (dir, root, otherRoot, manifest) {
  if (dir === root)
    return;
  const otherDir = join(otherRoot, convertToRelative(dir, root));

  const dirIsDeleted = manifest[root] && // A check to see if initialising for the first time
    ((manifest[dir] === false && !fs.existsSync(dir)) ||
    (manifest[otherDir] === false && !fs.existsSync(otherDir)));

  if (dirIsDeleted) {
    await deleteDeep(dir);
    await deleteDeep(otherDir);
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
    await deleteDeep(file);
    await deleteDeep(otherFile);
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

function readdir (path, ignoreRegex) {
  const result = { files: [], dirs: [] };
  for (const { path: p, stats } of walkdir(path, { ignore: ignoreRegex })) {
    if (stats.isDirectory()) {
      result.dirs.push(p);
    } else {
      result.files.push(p);
    }
  }
  return result;
}

(async () => {
  console.time('sync.js');

  await Promise.all(config.map(async ({ cloudDirPath, localDirPath, repoName, ignore, active }) => {
    if (!active || (CONFIG_RUN_SELECTION.length && !CONFIG_RUN_SELECTION.includes(repoName)))
      return;
    console.log(`${action}ing ${repoName}`);
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

    const cloud = readdir(cloudDirPath, ignore);
    const local = readdir(localDirPath, ignore);

    updateManifest(manifest, ignore);

    if (['sync', 'pull'].includes(action)) {
      for (const dir of cloud.dirs)
        await directoryFunc(dir, cloudDirPath, localDirPath, manifest);
    }
    if (['sync', 'push'].includes(action)) {
      for (const dir of local.dirs)
        await directoryFunc(dir, localDirPath, cloudDirPath, manifest);
    }

    if (['sync', 'pull'].includes(action)) {
      for (const file of cloud.files)
        await fileFunc(file, cloudDirPath, localDirPath, manifest);
    }
    if (['sync', 'push'].includes(action)) {
      for (const file of local.files)
        await fileFunc(file, localDirPath, cloudDirPath, manifest);
    }

    updateManifest(manifest, ignore);
    manifest[cloudDirPath] = manifest[localDirPath] = true;

    console.timeEnd(repoName);
  }));

  // Overwrite manifest file:
  if (!process.env.TEST) {
    fs.writeFileSync('./manifest.json', JSON.stringify(manifestFile, null, 2));
    console.log('Saved manifest.json');
  }

  console.timeEnd('sync.js');
})();
