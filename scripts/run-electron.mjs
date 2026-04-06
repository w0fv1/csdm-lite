#!/usr/bin/node
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import electronPath from 'electron';
import { ensureElectronSqliteBinding } from './ensure-electron-sqlite-binding.mjs';

const rootFolderPath = fileURLToPath(new URL('..', import.meta.url));

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.CSDM_SQLITE_NATIVE_BINDING_PATH;

const electronBindingPath = await ensureElectronSqliteBinding(rootFolderPath);
env.CSDM_SQLITE_NATIVE_BINDING_PATH = electronBindingPath;

const child = spawn(String(electronPath), ['.'], {
  stdio: 'inherit',
  windowsHide: false,
  env,
});

child.on('exit', (code, signal) => {
  if (code === null) {
    console.error(`Electron exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code);
});
