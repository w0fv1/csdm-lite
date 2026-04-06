import { db } from 'csdm/node/database/database';
import { MapAlreadyExists } from './errors/map-already-exists';
import type { InsertableMap } from './map-table';
import { isSqliteUniqueConstraintError } from '../is-sqlite-error';

export async function insertMaps(maps: InsertableMap[]) {
  try {
    const insertedMaps = await db.insertInto('maps').values(maps).returningAll().execute();

    return insertedMaps;
  } catch (error) {
    if (isSqliteUniqueConstraintError(error)) {
      throw new MapAlreadyExists();
    }

    throw error;
  }
}
