'use strict';
const fs = require('fs');
const { join, basename } = require('path');
const {
  convertToRelative,
  mkdir,
  stat,
  copyFile,
  pathExists
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
    ((manifest[dir] === false && !await pathExists(dir, 0)) ||
    (manifest[otherDir] === false && !await pathExists(otherDir, 0)));

  if (dirIsDeleted) {
    await deleteDeep(dir);
    await deleteDeep(otherDir);
    manifest[dir] = manifest[otherDir] = false;
  // If the directory at path doesn't exists then make it:
  } else if (!await pathExists(otherDir, 0)) {
    await mkdir(otherDir, manifest);
    manifest[dir] = true;
  }
}

async function fileFunc (file, root, otherRoot, manifest) {
  const otherFile = join(otherRoot, convertToRelative(file, root));

  const fileIsDeleted = manifest[root] && // A check to see if initialising
    ((manifest[file] === false && !await pathExists(file, 0)) ||
    (manifest[otherFile] === false && !await pathExists(otherFile, 0)));

  if (fileIsDeleted) {
    await deleteDeep(file);
    await deleteDeep(otherFile);
    manifest[file] = manifest[otherFile] === false;
  } else if (!await pathExists(otherFile, 0))
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
    return null;
  const flags = str.substring(str.lastIndexOf('/') + 1);
  const source = str.substring(1, str.lastIndexOf('/'));
  return new RegExp(source, flags);
}

async function updateManifest (manifest, ignore, matchFile) {
  for (const path in manifest) {
    if (
      manifest[path] === false ||
      (ignore instanceof RegExp && ignore.test(manifest[path])) ||
      (matchFile instanceof RegExp && !matchFile.test((basename(manifest[path]))))
    )
      delete manifest[path]; // Remove old deleted flagged paths or if it's being ignored
    else if (!await pathExists(path, 0))
      manifest[path] = false; // Flag as deleted.
  }
}

function readdir (path, ignore, matchFile) {
  const result = { files: [], dirs: [] };
  for (const { path: p, stats } of walkdir(path, { ignore })) {
    if (stats.isDirectory()) {
      result.dirs.push(p);
    } else if (!matchFile || (matchFile instanceof RegExp && matchFile.test(basename(p)))) {
      result.files.push(p);
    }
  }
  return result;
}

(async () => {
  console.time('sync.js');

  await Promise.all(config.map(async ({
    cloudDirPath, localDirPath, repoName, ignore, matchFile, active
  }) => {
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
    matchFile = parseRegExp(matchFile);

    cloudDirPath = cloudDirPath.replace(/\//g, '\\');
    localDirPath = localDirPath.replace(/\//g, '\\');
    if (!await pathExists(cloudDirPath, 0))
      await mkdir(cloudDirPath, manifest);
    if (!await pathExists(localDirPath, 0))
      await mkdir(localDirPath, manifest);

    const cloud = readdir(cloudDirPath, ignore, matchFile);
    const local = readdir(localDirPath, ignore, matchFile);

    await updateManifest(manifest, ignore, matchFile);

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

    await updateManifest(manifest, ignore, matchFile);
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
