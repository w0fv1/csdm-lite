import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import type { MapNamesFilter } from 'csdm/common/types/search/map-names-filter';

export async function searchMapNames({ name, ignoredNames }: MapNamesFilter) {
  const likePattern = `%${name.toLowerCase()}%`;
  const query = db
    .selectFrom('demos')
    .innerJoin('matches', 'matches.checksum', 'demos.checksum')
    .select(['demos.map_name'])
    .where(sql<boolean>`LOWER(demos.map_name) LIKE ${likePattern}`)
    .orderBy('demos.map_name');

  const rows = await query.execute();
  const seenMapNames = new Set<string>();
  const maps: string[] = [];
  for (const row of rows) {
    if (ignoredNames.includes(row.map_name) || seenMapNames.has(row.map_name)) {
      continue;
    }

    seenMapNames.add(row.map_name);
    maps.push(row.map_name);
    if (maps.length === 20) {
      break;
    }
  }

  return maps;
}
