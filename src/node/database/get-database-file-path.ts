import path from 'node:path';
import { getAppFolderPath } from 'csdm/node/filesystem/get-app-folder-path';

export function getDatabaseFilePath() {
  return path.resolve(getAppFolderPath(), 'csdm.sqlite');
}
