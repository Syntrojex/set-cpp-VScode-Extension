'use strict';
const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { KNOWN_INSTALL_LOCATIONS } = require('./config');

function findOnPath() {
  try {
    const out = execSync('g++ --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out.split('\n')[0].trim();
  } catch (e) {
    return null;
  }
}

const GPP_BINARY = process.platform === 'win32' ? 'g++.exe' : 'g++';

function scanKnownLocations() {
  const found = [];
  for (const dir of KNOWN_INSTALL_LOCATIONS) {
    const gppPath = path.join(dir, GPP_BINARY);
    if (fs.existsSync(gppPath)) {
      try {
        const out = execFileSync(gppPath, ['--version'], { encoding: 'utf8' });
        found.push({ dir, version: out.split('\n')[0].trim() });
      } catch (e) {
        found.push({ dir, version: 'found, but could not run --version' });
      }
    }
  }
  return found;
}

function findCompiler() {
  const onPath = findOnPath();
  const others = scanKnownLocations();
  return { onPath, others };
}

module.exports = { findOnPath, scanKnownLocations, findCompiler };
