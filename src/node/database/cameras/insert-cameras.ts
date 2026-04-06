import { randomUUID } from 'node:crypto';
import { db } from 'csdm/node/database/database';
import type { InsertableCamera } from './cameras-table';
import { CameraAlreadyExists } from './errors/camera-already-exists';
import { isSqliteUniqueConstraintError } from '../is-sqlite-error';

export async function insertCamera(camera: InsertableCamera) {
  try {
    const rows = await db
      .insertInto('cameras')
      .values({
        id: camera.id ?? randomUUID(),
        ...camera,
      })
      .returningAll()
      .execute();

    if (rows.length === 0) {
      throw new Error('Failed to insert camera');
    }

    return rows[0];
  } catch (error) {
    if (isSqliteUniqueConstraintError(error)) {
      throw new CameraAlreadyExists();
    }

    throw error;
  }
}
