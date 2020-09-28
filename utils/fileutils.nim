import os, re, strformat

proc passesRegexs (path: string, ignore: Regex, match: Regex): bool =
  return (if ignore == nil: true else: not contains(path, ignore)) and
    (if match == nil: true else: contains(path, match))

iterator forEachPath* (
  path: string, ignore: Regex = nil, match: Regex = nil
): tuple[kind: PathComponent, path: string] =
  ## Recursively iterates over all files and directories in or at path.
  ## Note: it uses Breadth First Search.

  if passesRegexs(path, ignore, match):
    let info = getFileInfo(path)
    if info.kind == pcFile:
      yield (info.kind, path)
    elif info.kind == pcDir:
      yield (info.kind, path)
      var stack: seq[string]
      stack.add(path)
      while (stack.len > 0):
        for kind, path in walkDir(stack.pop()):
          if passesRegexs(path, ignore, match):
            if kind == pcFile: yield (kind, path)
            elif kind == pcDir:
              yield (kind, path)
              stack.add(path)

proc readdir* (
  dir: string, ignore: Regex = nil, match: Regex = nil
): tuple[files: seq[string], dirs: seq[string]] =
  ## Recursively finds all files and directories in or at dir and returns them.
  for kind, path in forEachPath(dir, ignore, match):
    if kind == pcFile:
      result.files.add(path)
    elif kind == pcDir:
      result.dirs.add(path)

proc existsPath* (path: string): int =
  if existsFile path:
    return 1
  elif existsDir path:
    return 2
  else:
    return 0

proc delete* (path: string) =
  echo fmt" - '{path}'"
  case existsPath path:
    of 1:
      discard tryRemoveFile path
    of 2:
      removeDir path
    else:
      discard

let regex1 = re r"\\{2,}"
let regex2 = re "/+"
let dirSep = $DirSep
proc norm* (str: string): string =
  return str.multiReplace({regex1: dirSep, regex2: dirSep})
