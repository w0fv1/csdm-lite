#!/usr/bin/node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootFolderPath = fileURLToPath(new URL('..', import.meta.url));
const npxBinaryName = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function getSanitizedEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => {
      return !key.startsWith('=') && value !== undefined;
    }),
  );
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', command, ...args], {
            stdio: 'inherit',
            windowsHide: false,
            cwd: rootFolderPath,
            env,
          })
        : spawn(command, args, {
            stdio: 'inherit',
            windowsHide: false,
            cwd: rootFolderPath,
            env,
          });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code} and signal ${signal}`));
    });

    child.on('error', reject);
  });
}

const env = getSanitizedEnvironment();
delete env.ELECTRON_RUN_AS_NODE;
delete env.CSDM_SQLITE_NATIVE_BINDING_PATH;

const electronPackageJsonPath = path.join(rootFolderPath, 'node_modules', 'electron', 'package.json');
const electronVersion = JSON.parse(fs.readFileSync(electronPackageJsonPath, 'utf8')).version;

await run(npxBinaryName, ['@electron/rebuild', '-f', '-w', 'better-sqlite3', '-v', electronVersion]);
await run(npxBinaryName, ['electron-builder', '--config', 'electron-builder.config.mjs', ...process.argv.slice(2)]);
