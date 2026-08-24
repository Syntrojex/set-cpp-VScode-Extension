'use strict';
const https = require('https');
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');
const { MINGW_ZIP_URL, ZIP_TMP_PATH, PRIMARY_INSTALL_DIR, FALLBACK_INSTALL_DIR } = require('./config');

// Zero-dependency downloader with a plain-text progress readout, follows redirects.
function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let receivedBytes = 0;
    let totalBytes = 0;
    let lastPercent = -1;

    const request = (currentUrl) => {
      https
        .get(currentUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed with status code ${res.statusCode}`));
            return;
          }

          totalBytes = parseInt(res.headers['content-length'] || '0', 10);

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes) {
              const percent = Math.floor((receivedBytes / totalBytes) * 100);
              if (percent !== lastPercent) {
                lastPercent = percent;
                const mb = (receivedBytes / 1024 / 1024).toFixed(1);
                const totalMb = (totalBytes / 1024 / 1024).toFixed(1);
                process.stdout.write(`\r  Downloading... ${percent}% (${mb}MB / ${totalMb}MB)`);
              }
            }
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close(() => {
              process.stdout.write('\n');
              resolve();
            });
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => reject(err));
        });
    };

    request(url);
  });
}

// Uses Windows' built-in PowerShell Expand-Archive — no 7zip / no npm dependency required.
function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${destDir}" -Force`],
    { stdio: 'ignore' }
  );
}

// winlibs zips extract into a top-level "mingw64" folder — flatten it up one level.
function flattenIfNested(destDir) {
  const nested = path.join(destDir, 'mingw64');
  if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) {
    for (const item of fs.readdirSync(nested)) {
      fs.renameSync(path.join(nested, item), path.join(destDir, item));
    }
    fs.rmdirSync(nested);
  }
}

function canWriteTo(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.set-cpp-write-test');
    fs.writeFileSync(probe, 'x');
    fs.unlinkSync(probe);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Installs MinGW to C:\mingw64. If that's not writable without elevation,
 * falls back to C:\Users\Public\mingw64 (still on the C: drive, still
 * shared/global, no admin rights needed).
 * Returns the directory it actually installed into.
 */
async function downloadAndInstall(onFallback) {
  await download(MINGW_ZIP_URL, ZIP_TMP_PATH);

  let targetDir = PRIMARY_INSTALL_DIR;
  if (!canWriteTo(PRIMARY_INSTALL_DIR)) {
    targetDir = FALLBACK_INSTALL_DIR;
    if (typeof onFallback === 'function') onFallback(targetDir);
  }

  extractZip(ZIP_TMP_PATH, targetDir);
  flattenIfNested(targetDir);
  fs.unlinkSync(ZIP_TMP_PATH);
  return targetDir;
}

module.exports = { download, extractZip, flattenIfNested, canWriteTo, downloadAndInstall };
