import { sql } from 'kysely';
import { db } from '../database';

export async function deleteOldDownloadHistories() {
  await db
    .deleteFrom('download_history')
    .where('downloaded_at', '<', sql<Date>`datetime('now', '-1 month')`)
    .execute();
}
