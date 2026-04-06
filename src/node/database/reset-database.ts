import { sql } from 'kysely';
import type { Transaction } from 'kysely';
import type { Database } from './schema';

export async function resetDatabase(transaction: Transaction<Database>) {
  await sql`PRAGMA foreign_keys = OFF`.execute(transaction);
  const objects = await sql<{ type: string; name: string }>`
    SELECT type, name
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
  `.execute(transaction);

  for (const object of objects.rows) {
    if (object.type !== 'table' && object.type !== 'view' && object.type !== 'trigger') {
      continue;
    }

    await sql.raw(`DROP ${object.type.toUpperCase()} IF EXISTS "${object.name}"`).execute(transaction);
  }

  await sql`PRAGMA foreign_keys = ON`.execute(transaction);
}
