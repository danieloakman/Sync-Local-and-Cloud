import os, strformat, times, utils/fileutils, re, cligen, json, tables, strutils, threadpool
{.experimental: "parallel".}

var test: bool

proc parseRegex (regex: string): Regex =
  if regex == "":
    return re"(?=a)b"
  if not match(regex, re"^/.+/.*$"):
    raise newException(IOError, $fmt("Regex parse error on string: {regex}"))
  
  let lastSlash = regex.rfind('/') - 1
  var flags: set[RegexFlag]
  for c in regex[lastSlash + 1 .. regex.high]:
    if c == 'i':
      flags = flags + {reIgnoreCase}
    # Not many other nim regex flags to support
  return re(regex[1 .. lastSlash], flags)

proc updateManifest (manifest: JsonNode, ignore: Regex) =
  for path, exists in manifest.getFields().pairs:
    if not getBool(exists) or contains(path, ignore):
      manifest.delete(path) # Remove old deleted flagged paths or if it's being ignored
    elif existsPath(path) == 0:
      manifest[path] = newJBool false # Flag as deleted.

proc directoryFunc (
  dir: string, root: string, otherRoot: string, manifest: JsonNode
) =
  if dir == root:
    return
  let otherDir = otherRoot / relativePath(dir, root)
  let dirExists = existsDir dir
  let otherDirExists = existsDir otherDir

  let dirIsDeleted = manifest{root}.getBool() and # A check to see if initialising for the first time
    ((manifest{dir} != nil and manifest{dir}.getBool() == false and not dirExists) or
    (manifest{otherdir} != nil and manifest{otherDir}.getBool() == false and not otherDirExists))

  if dirIsDeleted:
    if dirExists:
      echo fmt" - '{dir}'"
    if otherDirExists:
      echo fmt" - '{otherDir}'"
    if not test:
      removeDir dir
      removeDir otherDir
    manifest{dir} = newJBool false
    manifest{otherDir} = newJBool false
  elif not existsDir otherDir:
    # If the directory at otherDir doesn't exist then make it:
    echo fmt" + '{otherDir}'"
    if not test:
      createDir otherDir
    manifest{dir} = newJBool true
    manifest{otherDir} = newJBool true

proc fileFunc (
  file: string, root: string, otherRoot: string, manifest: JsonNode
) =
  let otherFile = otherRoot / relativePath(file, root)
  let fileExists = fileExists file
  let otherFileExists = fileExists otherFile

  let fileIsDeleted = manifest{root}.getBool() and # A check to see if initialising
    ((manifest{file} != nil and manifest{file}.getBool() == false and not fileExists) or
    (manifest{otherFile} != nil and manifest{otherFile}.getBool() == false and not otherFileExists))

  if fileIsDeleted:
    if fileExists:
      echo fmt" - '{file}'"
    if otherFileExists:
      echo fmt" - '{otherFile}'"
    if not test:
      removeFile file
      removeFile otherFile
    manifest{file} = newJBool false
    manifest{otherFile} = newJBool false
  elif not existsFile otherFile:
    echo fmt" + '{otherFile}'"
    if not test:
      copyFile file, otherFile
    manifest{otherFile} = newJBool true
  else:
    let fileMTime = getLastModificationTime file
    let otherFileMTime = getLastModificationTime otherFile
    # Compare modified times:
    if fileMTime > otherFileMTime:
      echo fmt" + '{otherFile}'"
      if not test:
        copyFile file, otherFile
      manifest{otherFile} = newJBool true
    elif fileMTime < otherFileMTime:
      echo fmt" + '{file}'"
      if not test:
        copyFile otherFile, file
      manifest{file} = newJBool true

proc syncRepo (config: JsonNode, manifest: JsonNode): JsonNode =
  var manifest = manifest
  if manifest == nil:
    manifest = %* {}
  let
    start = cpuTime()
    ignore = parseRegex(config["ignore"].getStr())
    cloudDirPath = config["cloudDirPath"].getStr()
    localDirPath = config["localDirPath"].getStr()
    repoName = config["repoName"].getStr()
  
  echo fmt"Syncing {repoName}"

  discard existsOrCreateDir(cloudDirPath)
  discard existsOrCreateDir(localDirPath)

  let cloud = readdir(cloudDirPath, ignore = ignore)
  let local = readdir(localDirPath, ignore = ignore)

  updateManifest(manifest, ignore)

  for dir in cloud.dirs:
    directoryFunc dir, cloudDirPath, localDirPath, manifest
  for dir in local.dirs:
    directoryFunc dir, localDirPath, cloudDirPath, manifest

  for file in cloud.files:
    fileFunc file, cloudDirPath, localDirPath, manifest
  for file in local.files:
    fileFunc file, localDirPath, cloudDirPath, manifest

  updateManifest(manifest, ignore)
  manifest{cloudDirPath} = newJBool true
  manifest{localDirPath} = newJBool true

  echo fmt"{repoName}: {cpuTime() - start}"
  return manifest

proc syncLocalAndCloud (
  configPath: string,
  manifestPath: string,
  test: bool = false
): int =
  let start = cpuTime()

  sync.test = test
  if test:
    echo " * Running in TEST mode"

  var config = parseJson(readFile(configPath))
  var manifest = parseJson(readFile(manifestPath))
  # var r: openArray[FlowVarBase, string]

  parallel:
    for c in config.getElems():
      if not c{"active"}.getBool():
        continue
      let repoName = c{"repoName"}.getStr()
      # r.add(spawn syncRepo(c, manifest{repoName}))
      let partOfManifest = ^spawn syncRepo(c, manifest{repoName})
      manifest{repoName} = partOfManifest
  # Run serially:
  # for c in config.getElems():
  #   if not c{"active"}.getBool():
  #     continue
  #   let repoName = c{"repoName"}.getStr()
  #   manifest{repoName} = syncRepo(c, manifest{repoName})

  # echo blockUntilAny(r)
  # echo r

  echo "Finished syncing all repos!"

  for key, value in manifest.getFields().pairs:
    echo "key: ", key
    echo "value is nil: ", value == nil
    echo key, " ", value

  if not test:
    writeFile(manifestPath, manifest.pretty 2)
  else:
    writeFile("./test.json", manifest.pretty 2)
  echo "Saved manifest.json"

  echo fmt"sync.nim: {cpuTime() - start}"
  echo "Press ENTER to end..."
  discard readLine(stdin)

# Dispatch syncLocalAndCloud functon as a CLI:
dispatch(
  syncLocalAndCloud,
  help = {
    "configPath": "Path to the config",
    "manifestPath": "Path to the manifest",
    "test": "Test/debug mode"
  }
)
