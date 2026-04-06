#!/usr/bin/node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const npmBinaryName = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxBinaryName = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function getSanitizedEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => {
      return !key.startsWith('=') && value !== undefined;
    }),
  );
}

function run(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', command, ...args], {
            stdio: 'inherit',
            windowsHide: false,
            cwd,
            env,
          })
        : spawn(command, args, {
            stdio: 'inherit',
            windowsHide: false,
            cwd,
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

function getInstalledPackageVersion(rootFolderPath, packageName) {
  const packageJsonPath = path.join(rootFolderPath, 'node_modules', packageName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function shouldRefreshBinding(bindingPath, metadataPath, expectedMetadata) {
  if (!fs.existsSync(bindingPath) || !fs.existsSync(metadataPath)) {
    return true;
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return Object.entries(expectedMetadata).some(([key, value]) => metadata[key] !== value);
  } catch {
    return true;
  }
}

export async function ensureElectronSqliteBinding(rootFolderPath) {
  const bindingFolderPath = path.join(rootFolderPath, 'build', 'electron');
  const bindingPath = path.join(bindingFolderPath, 'better_sqlite3.node');
  const metadataPath = path.join(bindingFolderPath, 'better_sqlite3.json');
  const nodeModulesBindingPath = path.join(
    rootFolderPath,
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node',
  );

  const expectedMetadata = {
    strategyVersion: 2,
    electronVersion: getInstalledPackageVersion(rootFolderPath, 'electron'),
    betterSqlite3Version: getInstalledPackageVersion(rootFolderPath, 'better-sqlite3'),
    arch: process.arch,
    platform: process.platform,
  };

  if (!shouldRefreshBinding(bindingPath, metadataPath, expectedMetadata)) {
    return bindingPath;
  }

  const env = getSanitizedEnvironment();
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.CSDM_SQLITE_NATIVE_BINDING_PATH;

  await run(npxBinaryName, ['@electron/rebuild', '-f', '-w', 'better-sqlite3', '-v', expectedMetadata.electronVersion], rootFolderPath, env);

  if (!fs.existsSync(nodeModulesBindingPath)) {
    throw new Error(`Could not find better-sqlite3 binding at ${nodeModulesBindingPath}`);
  }

  fs.mkdirSync(bindingFolderPath, { recursive: true });
  fs.copyFileSync(nodeModulesBindingPath, bindingPath);
  fs.writeFileSync(metadataPath, JSON.stringify(expectedMetadata, null, 2) + '\n');

  // Restore the default binding for the Node.js ABI so tests and CLI commands keep working.
  await run(npmBinaryName, ['rebuild', 'better-sqlite3'], rootFolderPath, env);

  return bindingPath;
}
