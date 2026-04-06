import fs from 'fs-extra';
import path from 'node:path';
import type { DatabaseSettings } from 'csdm/node/settings/settings';

export async function createDatabase(databaseSettings: DatabaseSettings) {
  await fs.ensureDir(path.dirname(databaseSettings.filePath));
}
