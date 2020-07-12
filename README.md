
# Sync-Local-and-Cloud

Syncs local repositories with those stored in cloud services and can specify files/directories to ignore. I made this mainly so I could ignore large dependency folders (like node_modules) and use cloud services to sync my working changes seamlessly between computers.
You can create a shortcut for any of the batch files and place them in the startup menu shortcuts folder (Windows feature).
I use Backup and Sync from Google but should work with dropbox and others too.

## Valid Properties in config.json
  
- `cloudDirPath` - The cloud directory path.

- `localDirPath` - The local directory path.

- `repoName` - The name of the repository.

- `ignore` - The regular expression that is used when ignoring certain paths. Leave as empty string to not ignore any paths. A valid example: `"ignore": "/\\.png/i"`, will ignore any paths that contain ".png" anywhere in the path (not just the file name, can be any of the directories before the file).

- `active` - Boolean. If set to false then it will just skip over this repository when ran.

## Usage
todo
