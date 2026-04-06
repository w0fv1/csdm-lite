import { defaultSettings } from './default-settings';
import { getSettings } from './get-settings';
import type { Settings } from './settings';
import { writeSettings } from './write-settings';
import { ensureSettingsDatabaseFilePath } from './ensure-settings-database-file-path';

export async function resetSettings() {
  const currentSettings = await getSettings();

  const newSettings: Settings = {
    ...defaultSettings,
    database: currentSettings.database,
  };

  await writeSettings(ensureSettingsDatabaseFilePath(newSettings));
}
