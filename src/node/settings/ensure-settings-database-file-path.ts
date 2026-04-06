import type { Settings } from './settings';
import { getDatabaseFilePath } from 'csdm/node/database/get-database-file-path';

export function ensureSettingsDatabaseFilePath(settings: Settings): Settings {
  const filePath = settings.database.filePath || getDatabaseFilePath();

  return {
    ...settings,
    database: {
      ...settings.database,
      filePath,
    },
  };
}
