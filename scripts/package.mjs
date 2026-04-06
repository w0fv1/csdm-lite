#!/usr/bin/node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootFolderPath = fileURLToPath(new URL('..', import.meta.url));
const npmBinaryName = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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
            cwd: rootFolderPath,
            stdio: 'inherit',
            windowsHide: false,
            env,
          })
        : spawn(command, args, {
            cwd: rootFolderPath,
            stdio: 'inherit',
            windowsHide: false,
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

const forwardedArgs = process.argv.slice(2);
const env = getSanitizedEnvironment();

await run(npmBinaryName, ['run', 'package:builder', '--', ...forwardedArgs]);
await run(npmBinaryName, ['rebuild', 'better-sqlite3']);
