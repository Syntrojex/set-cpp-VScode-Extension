'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const { findCompiler } = require('./find-compiler');
const { downloadAndInstall } = require('./compiler-fetch');
const { addToUserPath } = require('./system');
const { wireGlobalVscode } = require('./vscode-global');
const { PRIMARY_INSTALL_DIR } = require('./config');

/**
 * Runs the full detect → install → PATH → global VS Code wiring flow.
 * `log(message)` is called at each step so the caller can show progress
 * (a notification, an output channel, or both).
 *
 * Returns { ok: boolean, binDir?: string, message: string }
 */
async function runInstall(log = () => {}) {
  if (process.platform !== 'win32') {
    log('set-cpp currently only supports Windows.');
    return { ok: false, message: 'Unsupported platform' };
  }

  log('Scanning your system for an existing C++ compiler...');
  const { onPath, others } = findCompiler();
  let binDir;

  if (onPath) {
    log(`Found: ${onPath}`);
    binDir = path.dirname(execFileSync('where', ['g++'], { encoding: 'utf8' }).split('\n')[0].trim());
  } else if (others.length > 0) {
    log(`Found (not on PATH yet): ${others[0].version}`);
    addToUserPath(others[0].dir);
    log('Added to PATH.');
    binDir = others[0].dir;
  } else {
    log(`No compiler found. Installing MinGW-w64 to ${PRIMARY_INSTALL_DIR}...`);
    log('Downloading (~260MB) — this can take a few minutes.');
    let installedTo;
    try {
      installedTo = await downloadAndInstall((fallbackDir) => {
        log(`C:\\ isn't writable without admin rights — using ${fallbackDir} instead.`);
      });
    } catch (e) {
      log(`Download failed: ${e.message}`);
      return { ok: false, message: e.message };
    }
    log(`Installed to ${installedTo}`);
    binDir = path.join(installedTo, 'bin');
    const added = addToUserPath(binDir);
    log(added ? 'Added to PATH.' : 'Already on PATH.');
  }

  try {
    const version = execFileSync(path.join(binDir, 'g++.exe'), ['--version'], { encoding: 'utf8' }).split('\n')[0];
    log(`Verified: ${version}`);
  } catch (e) {
    log('Could not verify g++ — you may need to reload VS Code.');
  }

  const settingsPath = wireGlobalVscode(binDir);
  log(`VS Code wired up globally (${settingsPath}).`);
  log('Setup complete — this works in every folder VS Code opens now.');

  return { ok: true, binDir, message: 'Setup complete' };
}

module.exports = { runInstall };
