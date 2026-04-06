import fs from 'fs-extra';
import { getSettingsFilePath } from './get-settings-file-path';
import type { Settings } from './settings';
import { ensureSettingsDatabaseFilePath } from './ensure-settings-database-file-path';

export async function writeSettings(settings: Settings) {
  try {
    const settingsFilePath = getSettingsFilePath();
    const normalizedSettings = ensureSettingsDatabaseFilePath(settings);
    const json = JSON.stringify(normalizedSettings, null, 2);
    await fs.outputFile(settingsFilePath, json);
  } catch (error) {
    logger.error('Error while writing settings');
    logger.error(error);
    throw error;
  }
}
