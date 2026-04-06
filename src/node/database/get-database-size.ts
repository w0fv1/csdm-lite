import fs from 'fs-extra';
import { getSettings } from '../settings/get-settings';

export async function getDatabaseSize(): Promise<string> {
  const settings = await getSettings();
  const stats = await fs.stat(settings.database.filePath);
  const sizeInMegaBytes = stats.size / (1024 * 1024);

  return `${sizeInMegaBytes.toFixed(1)} MB`;
}
