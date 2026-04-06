import { db } from 'csdm/node/database/database';
import { assertValidTag } from './assert-valid-tag';
import { TagNameAlreadyTaken } from './errors/tag-name-already-taken';
import { tagRowToTag } from './tag-row-to-tag';
import type { InsertableTag } from './tag-table';
import { isSqliteUniqueConstraintError } from '../is-sqlite-error';

export async function insertTag(tag: InsertableTag) {
  assertValidTag(tag);

  try {
    const rows = await db.insertInto('tags').values(tag).returningAll().execute();
    const newTag = tagRowToTag(rows[0]);

    return newTag;
  } catch (error) {
    if (isSqliteUniqueConstraintError(error)) {
      throw new TagNameAlreadyTaken();
    }
    throw error;
  }
}
