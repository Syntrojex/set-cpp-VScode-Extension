'use strict';
const vscode = require('vscode');
const path = require('path');
const { findOnPath } = require('./src/find-compiler');
const { runInstall } = require('./src/install-flow');

const CPP_EXT_RE = /\.(cpp|cc|cxx)$/i;

let outputChannel;
let isSettingUp = false;

function log(msg) {
  outputChannel.appendLine(msg);
}

async function setupWithProgress() {
  if (isSettingUp) return;
  isSettingUp = true;
  outputChannel.show(true);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'set-cpp: setting up C++ compiler',
        cancellable: false
      },
      async (progress) => {
        const result = await runInstall((msg) => {
          log(msg);
          progress.report({ message: msg });
        });

        if (result.ok) {
          vscode.window.showInformationMessage('set-cpp: C++ compiler is ready. Reload VS Code to be safe.');
        } else {
          vscode.window.showErrorMessage(`set-cpp: setup failed — ${result.message}`);
        }
      }
    );
  } finally {
    isSettingUp = false;
  }
}

async function runActiveFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('set-cpp: no active file to run.');
    return;
  }

  const filePath = editor.document.fileName;
  if (!CPP_EXT_RE.test(filePath)) {
    vscode.window.showErrorMessage('set-cpp: active file is not a .cpp/.cc/.cxx file.');
    return;
  }

  if (process.platform === 'win32' && !findOnPath()) {
    const choice = await vscode.window.showWarningMessage(
      'set-cpp: no C++ compiler found on PATH yet.',
      'Set It Up'
    );
    if (choice === 'Set It Up') await setupWithProgress();
    return;
  }

  await editor.document.save();

  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const exePath = path.join(dir, `${baseName}.exe`);

  const terminal = vscode.window.createTerminal('Run C++');
  terminal.show();
  terminal.sendText(`g++ "${filePath}" -o "${exePath}" && "${exePath}"`);
}

function activate(context) {
  outputChannel = vscode.window.createOutputChannel('set-cpp');
  context.subscriptions.push(outputChannel);

  // Status bar Run button — only visible while a .cpp file is focused.
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(play) Run C++';
  statusBarItem.tooltip = 'Compile and run this C++ file (set-cpp)';
  statusBarItem.command = 'set-cpp.runActiveFile';

  function syncStatusBar(editor) {
    if (editor && CPP_EXT_RE.test(editor.document.fileName)) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  syncStatusBar(vscode.window.activeTextEditor);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(syncStatusBar));
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(vscode.commands.registerCommand('set-cpp.setup', setupWithProgress));
  context.subscriptions.push(vscode.commands.registerCommand('set-cpp.runActiveFile', runActiveFile));

  // Fully automatic — the ONLY manual step is installing this extension.
  // No prompt, no terminal, no npx: if there's no compiler, it just sets one up.
  if (process.platform === 'win32' && !findOnPath()) {
    setupWithProgress();
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
