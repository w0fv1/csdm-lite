import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export function getAppResourcePath(fileName: string) {
  const appPath = app.getAppPath();
  const directFilePath = path.join(appPath, fileName);
  if (fs.existsSync(directFilePath)) {
    return directFilePath;
  }

  return path.join(appPath, 'out', fileName);
}
