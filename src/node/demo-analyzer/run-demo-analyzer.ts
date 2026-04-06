import path from 'node:path';
import fs from 'fs-extra';
import { analyzeDemo, type Options as AnalyzeOptions } from '@akiver/cs-demo-analyzer';
import { getStaticFolderPath } from 'csdm/node/filesystem/get-static-folder-path';
import { isWindows } from 'csdm/node/os/is-windows';
import { CorruptedDemoError } from './corrupted-demo-error';

type RunDemoAnalyzerOptions = Omit<AnalyzeOptions, 'format' | 'executablePath'>;

function getNodeModulesExecutablePath() {
  const packageJsonPath = require.resolve('@akiver/cs-demo-analyzer/package.json');
  const packageFolderPath = path.dirname(packageJsonPath);
  const platformKey = `${process.platform}-${process.arch}`;
  const platformFolderPath = {
    'darwin-x64': 'darwin-x64',
    'darwin-arm64': 'darwin-arm64',
    'linux-x64': 'linux-x64',
    'linux-arm64': 'linux-arm64',
    'win32-x64': 'windows-x64',
  }[platformKey];

  if (platformFolderPath === undefined) {
    throw new Error(`Unsupported demo analyzer platform: ${platformKey}`);
  }

  return path.join(packageFolderPath, 'dist', 'bin', platformFolderPath, isWindows ? 'csda.exe' : 'csda');
}

export async function runDemoAnalyzer(
  options: Omit<RunDemoAnalyzerOptions, 'format' | 'executablePath'>,
): Promise<void> {
  const bundledExecutablePath = path.join(getStaticFolderPath(), isWindows ? 'csda.exe' : 'csda');
  const executablePath = (await fs.pathExists(bundledExecutablePath))
    ? bundledExecutablePath
    : getNodeModulesExecutablePath();

  await analyzeDemo({
    ...options,
    demoPath: path.resolve(options.demoPath),
    outputFolderPath: path.resolve(options.outputFolderPath),
    executablePath,
    format: 'csdm',
    onStderr: (data) => {
      options.onStderr?.(data);
      if (data.includes('ErrUnexpectedEndOfDemo')) {
        throw new CorruptedDemoError();
      }
    },
  });
}
