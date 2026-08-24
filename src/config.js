'use strict';
const os = require('os');
const path = require('path');

// NOTE: WinLibs releases update every few weeks. If this link ever 404s,
// grab a fresh "Win64 Zip archive" link from https://winlibs.com/ here.
const MINGW_ZIP_URL =
  'https://github.com/brechtsanders/winlibs_mingw/releases/download/16.1.0posix-14.0.0-ucrt-r2/winlibs-x86_64-posix-seh-gcc-16.1.0-mingw-w64ucrt-14.0.0-r2.zip';

// Primary: straight on C:\ so it's a real global install, not hidden in a
// per-user profile folder. Some locked-down machines don't allow writing to
// the drive root without admin rights — if that happens we fall back to
// C:\Users\Public, which is still on the C: drive and still shared/global
// across everything that user account touches, just without needing elevation.
const PRIMARY_INSTALL_DIR = 'C:\\mingw64';
const FALLBACK_INSTALL_DIR = 'C:\\Users\\Public\\mingw64';

const ZIP_TMP_PATH = path.join(os.tmpdir(), 'set-cpp-download.zip');

// Common places g++/MinGW already lives on a Windows machine, checked during
// auto-detection so we never re-download something that's already there.
const KNOWN_INSTALL_LOCATIONS = [
  path.join(PRIMARY_INSTALL_DIR, 'bin'),
  path.join(FALLBACK_INSTALL_DIR, 'bin'),
  'C:\\MinGW\\bin',
  'C:\\msys64\\mingw64\\bin',
  'C:\\msys64\\ucrt64\\bin',
  'C:\\TDM-GCC-64\\bin',
  'C:\\Strawberry\\c\\bin',
  'C:\\ProgramData\\chocolatey\\lib\\mingw\\tools\\install\\mingw64\\bin',
  path.join(os.homedir(), 'scoop', 'apps', 'mingw', 'current', 'bin'),
  path.join(os.homedir(), 'scoop', 'apps', 'gcc', 'current', 'bin')
];

// Global VS Code User settings.json — NOT tied to any workspace/folder, so
// once written here, IntelliSense + the built-in Run button work in every
// folder VS Code ever opens, on this machine, for this user.
const VSCODE_USER_SETTINGS = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'Code',
  'User',
  'settings.json'
);

module.exports = {
  MINGW_ZIP_URL,
  PRIMARY_INSTALL_DIR,
  FALLBACK_INSTALL_DIR,
  ZIP_TMP_PATH,
  KNOWN_INSTALL_LOCATIONS,
  VSCODE_USER_SETTINGS
};
