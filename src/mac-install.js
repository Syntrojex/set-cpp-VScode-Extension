'use strict';
const { execSync, spawn } = require('child_process');

/**
 * Checks if Xcode Command Line Tools (which include clang/g++) are already
 * installed, via `xcode-select -p`.
 */
function isXcodeToolsInstalled() {
  try {
    execSync('xcode-select -p', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Triggers the native macOS installer dialog for Command Line Tools.
 * Apple requires explicit user consent through this GUI dialog — there is
 * no way to install it silently/headlessly, by design. This function only
 * *starts* the process; it does not (and cannot) wait for the user to
 * finish clicking through it.
 */
function triggerXcodeToolsInstall() {
  spawn('xcode-select', ['--install'], { detached: true, stdio: 'ignore' }).unref();
}

module.exports = { isXcodeToolsInstalled, triggerXcodeToolsInstall };
