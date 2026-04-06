import { getDatabaseFilePath } from 'csdm/node/database/get-database-file-path';
import type { Migration } from '../migration';

const v13: Migration = {
  schemaVersion: 13,
  run: async (settings) => {
    settings.database = {
      ...settings.database,
      filePath: settings.database.filePath ?? getDatabaseFilePath(),
    };

    return settings;
  },
};

export default v13;
