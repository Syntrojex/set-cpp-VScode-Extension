'use strict';
const vscode = require('vscode');
const { findOnPath } = require('./src/find-compiler');
const { isGloballyWired } = require('./src/vscode-global');
const { runInstall } = require('./src/install-flow');

let outputChannel;
let isSettingUp = false;

function log(msg) {
  outputChannel.appendLine(msg);
}

/**
 * Runs the full detect/install/wire flow with a progress notification.
 * This is the ONLY thing Setify C++ does — it never adds its own Run
 * button or menu entries. Once a compiler is detected/installed and wired
 * into VS Code's global settings, VS Code's own built-in Run (the ▶ icon
 * the C/C++ extension provides, or the Run menu) just works on its own.
 */
async function setupWithProgress() {
  if (isSettingUp) return null;
  isSettingUp = true;
  outputChannel.show(true);

  let result = null;
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Setify C++: setting up your C++ compiler',
        cancellable: false
      },
      async (progress) => {
        result = await runInstall((msg) => {
          log(msg);
          progress.report({ message: msg });
        });

        if (result.ok) {
          vscode.window.showInformationMessage(
            'Setify C++: your C++ compiler is ready. Open a .cpp file and use VS Code\'s Run button.'
          );
        } else {
          vscode.window.showWarningMessage(`Setify C++: ${result.message}`);
        }
      }
    );
  } finally {
    isSettingUp = false;
  }
  return result;
}

function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Setify C++');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(vscode.commands.registerCommand('setify-cpp.setup', setupWithProgress));

  // Fully automatic — the ONLY manual step is installing this extension
  // (and, on macOS, clicking "Install" in the one native Apple dialog).
  //
  // Self-healing, checked fresh on every activation instead of a one-time
  // flag: setup runs whenever EITHER a compiler isn't found OR VS Code's
  // global settings aren't wired to one yet. This guarantees a compiler
  // that already existed still gets wired up (not just newly-installed
  // ones), AND that wiring which was somehow removed or never completed
  // gets fixed automatically next time VS Code starts — without ever
  // re-downloading anything when a compiler is already present, since that
  // check (isGloballyWired) is just a fast local file read.
  if (!findOnPath() || !isGloballyWired()) {
    setupWithProgress();
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
