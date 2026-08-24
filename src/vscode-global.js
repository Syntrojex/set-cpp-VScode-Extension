'use strict';
const fs = require('fs');
const path = require('path');
const { VSCODE_USER_SETTINGS } = require('./config');

/**
 * Strips // and /* *\/ comments from a JSONC file so it can be JSON.parse'd.
 * VS Code's settings.json allows comments; a naive parse would choke on them.
 */
function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readSettings() {
  if (!fs.existsSync(VSCODE_USER_SETTINGS)) return {};
  try {
    return JSON.parse(stripJsonComments(fs.readFileSync(VSCODE_USER_SETTINGS, 'utf8')));
  } catch (e) {
    return {}; // if the existing file is unparseable, don't block install — just don't merge
  }
}

/**
 * Writes compiler info into VS Code's GLOBAL user settings — this is what
 * makes it work in any folder/project VS Code ever opens, not just the one
 * you happened to run set-cpp in. Existing unrelated settings are preserved.
 */
function wireGlobalVscode(binDir) {
  const gppPath = path.join(binDir, 'g++.exe').replace(/\\/g, '/');
  const gdbPath = path.join(binDir, 'gdb.exe').replace(/\\/g, '/');

  const settings = readSettings();

  settings['C_Cpp.default.compilerPath'] = gppPath;
  settings['C_Cpp.default.cStandard'] = 'c17';
  settings['C_Cpp.default.cppStandard'] = 'c++17';
  settings['C_Cpp.default.intelliSenseMode'] = 'windows-gcc-x64';
  settings['C_Cpp.default.debuggerPath'] = gdbPath;

  fs.mkdirSync(path.dirname(VSCODE_USER_SETTINGS), { recursive: true });
  fs.writeFileSync(VSCODE_USER_SETTINGS, JSON.stringify(settings, null, 4));

  return VSCODE_USER_SETTINGS;
}

function isGloballyWired() {
  const settings = readSettings();
  return Boolean(settings['C_Cpp.default.compilerPath']);
}

/**
 * Removes only the keys set-cpp added, leaving the rest of the user's
 * VS Code settings untouched. Returns true if anything was actually removed.
 */
function unwireGlobalVscode() {
  if (!fs.existsSync(VSCODE_USER_SETTINGS)) return false;
  const settings = readSettings();
  const keys = [
    'C_Cpp.default.compilerPath',
    'C_Cpp.default.cStandard',
    'C_Cpp.default.cppStandard',
    'C_Cpp.default.intelliSenseMode',
    'C_Cpp.default.debuggerPath'
  ];
  let removedAny = false;
  for (const key of keys) {
    if (key in settings) {
      delete settings[key];
      removedAny = true;
    }
  }
  if (removedAny) {
    fs.writeFileSync(VSCODE_USER_SETTINGS, JSON.stringify(settings, null, 4));
  }
  return removedAny;
}

module.exports = { wireGlobalVscode, isGloballyWired, unwireGlobalVscode, VSCODE_USER_SETTINGS };
