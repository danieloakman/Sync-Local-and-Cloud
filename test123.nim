# import os
# echo dirExists("./utils")
# echo fileExists("./test123.nim")
# echo dirExists("./test123.nim")
# echo fileExists("./utils")

# proc test (a: int, b: int): (int, int) =
#   result[0] = a + 1
#   result[1] = b + 1
# echo test(5, 6)

# import os, strformat
# proc readDirectory (dir: string): (seq[string], seq[string]) =
#   if existsFile(dir):
#     result[0].add(dir)
#     return result
#   elif existsDir(dir):
#     result[1].add(dir)
#     for path in walkDirRec(dir):
#       if existsFile(path):
#         result[0].add(path)
#       elif existsDir(path):
#         result[1].add(path)

# proc stringify (s: seq|array): string =
#   result.add("[\n")
#   for v in s:
#     result.add(fmt("  {v}\n"))
#   result.add("]")

# let (files, dirs) = readDirectory("./utils")
# echo "files: ", stringify(files)
# echo "dirs: ", stringify(dirs)

# import cligen, strformat
# proc test(book = "book") =
#   echo fmt("book: {book}")
# dispatch(test)

# import os, glob
# proc test (str: string, regex: Regex = re"(?=a)b") =
#   if match(str, regex):
#     echo str
# test("oh ok", re"oh yeah")
# test("something", re"some")
# test("blah", re"b")
# test(getCurrentDir(), re"ync")

# import os, glob
# # echo getCurrentDir() / "test123.nim"
# echo matches("""C:\CodeRepos\Personal\Sync-Local-and-Cloud\node_modules""", "node_modules\\")

# import re
# echo contains("""C:\CodeRepos\Personal\Sync-Local-and-Cloud\node_modules""", re"node_modules")
# echo contains(r"nodemodules", re"modules")

# proc normalisePath ():

# import glob, os
# for path in walkGlob(
#   r"{,!(node_modules)/**/}*.js",
#   filterDescend = proc (path: string): bool = return true
# ):
#   echo path

# import os, times
# var start = getTime()
# echo existsFile("./test123.js")
# echo getTime() - start

# import utils/file-utils, os, re, times, strformat
# let start = getTime()
# let (files, dirs) = readdir(getCurrentDir(), ignore = re"node_modules")
# echo getTime() - start
# echo fmt"files: {files.len}, dirs: {dirs.len}"

# import os
# for _, path in walkDir("./"):
#   echo path

# import utils/fileutils, os, re, strformat, times

# for kind, path in forEachPath(getCurrentDir(), ignore = re"node_modules|\.git"):
#   echo kind, "\t", path
# echo "\n ---\n"
# for (kind, path) in forEachPathRec(getCurrentDir(), ignore = re"node_modules|\.git"):
#   echo kind, "\t", path
# var start = getTime()
# let (files, dirs) = readdir(getCurrentDir() / "../")
# echo "t1: ", getTime() - start
# start = getTime()
# let (files2, dirs2) = readdirRec(getCurrentDir() / "../")
# echo "t2: ", getTime() - start
# echo fmt"files: {files.len}, dirs: {dirs.len}"
# echo fmt"files2: {files2.len}, dirs2: {dirs2.len}"
# echo dirs
# echo dirs2

# import re
# proc parseRegex (regex: string) =
#   let m = match(regex, re"^/.+/$")
#   echo "match: ", m

# parseRegex("/node_modules/")

# import strutils
# var s = "something"
# echo s[0..2]

# Compute PI in an inefficient way
# import strutils, math, threadpool, tables
# {.experimental: "parallel".}
# proc term(k: float): float = 4 * math.pow(-1, k) / (2*k + 1)
# proc pi(n: int): float =
#   var ch = newSeq[float](n+1)
#   parallel:
#     for k in 0..ch.high:
#       ch[k] = spawn term(float(k))
#   for k in 0..ch.high:
#     result += ch[k]
# echo formatFloat(pi(5000))

# import threadpool, utils/fileutils, strformat, re, times, json, strutils
# {.experimental: "parallel".}

# type
#   ConfigElemement = object
#     cloudDirPath: string
#     localDirPath: string
#     repoName: string
#     ignore: string
#     active: bool

# proc term (config: ConfigElemement, ignore: Regex = nil) =
#   if not config.active:
#     return
#   let repoName = config.repoName
#   let localDirPath = config.localDirPath
#   let cloudDirPath = config.cloudDirPath

#   let start = cpuTime()
#   # echo fmt"started '{repoName}'"
#   var (files, dirs) = readdir(localDirPath, ignore)
#   echo fmt"at '{localDirPath}': files: {files.len}, dirs: {dirs.len}"
#   var (files2, dirs2) = readdir(cloudDirPath, ignore)
#   echo fmt"at '{cloudDirPath}': files: {files.len}, dirs: {dirs.len}"
#   echo fmt"'{repoName}': {cpuTime() - start}"

# proc main () =
#   let start = cpuTime()
#   var config = parseJson(readFile(r"C:\Users\doakm\Google Drive\CodeRepos\config.json"))
#   parallel:
#     for element in config.getElems():
#       let c = to(element, ConfigElemement)
#       spawn term(c, re"node_modules")
#   echo fmt"total: {cpuTime() - start}"
# main()

# for path in ["a", "b", "c"]:
#   echo path

# import json
# proc updateManifest (manifest: var JsonNode) =
#   manifest["something"] = newJBool true
# var config = parseJson(readFile(r"C:\Users\doakm\Google Drive\CodeRepos\config.json"))
# var manifest = parseJson(readFile(r"C:\CodeRepos\Personal\Sync-Local-and-Cloud\manifest.json"))
# for c in config.getElems():
#   let repoName = c["repoName"].getStr()
#   echo repoName, " ", manifest[repoName].len
#   var m = manifest[repoName]
#   updateManifest(m)
#   # manifest[repoName]["something"] = newJString("something")
# writeFile("./test.json", manifest.pretty 2)

# proc p (a: var string) =
#   a.add("something")
# var str = "abc"
# p(str)
# echo str

# import os
# echo existsOrCreateDir(getCurrentDir() / "test")

# import json
# var manifest = parseJson readFile r"C:\CodeRepos\Personal\Sync-Local-and-Cloud\manifest.json"
# let repoName = "something"
# if manifest{repoName} == nil:
#   manifest[repoName] = %* {}
# manifest[repoName]["something"] = newJBool true
# writeFile("./test.json", manifest.pretty 2)

# import json, tables
# var manifest = parseJson readFile r"./test.json"
# var m = manifest["test"].getFields()
# for path, exists in m.pairs:
#   echo path, " ", exists

# import os, utils/fileutils
# var path = r"C:\\\\CodeRepos\\\\Personal\\\\test\\\\dir2////New Text Document.txt"
# echo existsFile path
# echo path.norm()
# copyFile path, multiReplace(path, {"\\": r"\", ".txt": "-2.txt"})

# import threadpool, json
# {.experimental: "parallel".}
# # var config = parseJson(readFile(r"C:\Users\doakm\Google Drive\CodeRepos\config.json"))
# # var manifest = parseJson(readFile(r"C:\CodeRepos\Personal\Sync-Local-and-Cloud\manifest.json"))
# var config = %* [{ "repoName": "test1" }, { "repoName": "test2" }]
# var manifest = %* { "test1": {}, "test2": {} }
# proc updateManifest (manifest: JsonNode) =
#   manifest{"something"} = newJBool true
# proc term (config: JsonNode, m: JsonNode): JsonNode =
#   updateManifest(m)
#   return m

# parallel:
#   for c in config.getElems():
#     let repoName = c["repoName"].getStr()
#     var m = ^spawn term(c, manifest{repoName})
#     manifest{repoName} = m
#     # manifest{part} = new JObject m
# echo manifest.pretty 2

# import os, strutils
# var path = r"some\\\\path\\\\to\\\\somewhere"
# echo path.norm()

# import re, strformat, strutils
# proc parseRegex (regex: string): Regex =
#   if regex == "":
#     return re"(?=a)b"
#   if not match(regex, re"^/.+/.*$"):
#     raise newException(IOError, $fmt("Regex parse error on string: {regex}"))
  
#   let lastSlash = regex.rfind('/') - 1
#   var flags: set[RegexFlag]
#   for c in regex[lastSlash + 1 .. regex.high]:
#     if c == 'i':
#       flags = flags + {reIgnoreCase}
#     # Not many other nim regex flags to support
#   return re(regex[1 .. lastSlash], flags)
# let regex = parseRegex "/node_modules/i"
# # echo repr re"something"
# # echo repr regex
# echo "contains: ", contains(r"something\node_modules", regex)
# echo "match: ", match(r"something\node_modules", regex)