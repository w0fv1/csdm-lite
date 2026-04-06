'use strict';

if (process.env.ELECTRON_RUN_AS_NODE === '1') {
  const { spawn } = require('node:child_process');

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    windowsHide: false,
    env,
  });

  child.on('exit', (code, signal) => {
    if (code === null) {
      console.error(`Electron exited with signal ${signal}`);
      process.exit(1);
      return;
    }

    process.exit(code);
  });
} else {
  require('./out/main.js');
}
