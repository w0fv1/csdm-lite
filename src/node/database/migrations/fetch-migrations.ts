import { db } from '../database';
import { ensureDate } from '../ensure-date';

export type Migration = { version: number; date: string };

export async function fetchMigrations(limit: number): Promise<Migration[]> {
  const migrations = await db
    .selectFrom('migrations')
    .select(['schema_version as version', 'run_at as date'])
    .orderBy('run_at', 'desc')
    .limit(limit)
    .execute();

  return migrations.map((migration) => {
    return {
      ...migration,
      date: ensureDate(migration.date).toISOString(),
    };
  });
}
