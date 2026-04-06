import { db } from 'csdm/node/database/database';
import { isSqliteUniqueConstraintError } from '../is-sqlite-error';
import { assertValidTag } from './assert-valid-tag';
import { TagNameAlreadyTaken } from './errors/tag-name-already-taken';
import type { Tag } from '../../../common/types/tag';

export async function updateTag(tag: Tag) {
  assertValidTag(tag);

  try {
    await db.updateTable('tags').set(tag).where('id', '=', tag.id).execute();
  } catch (error) {
    if (isSqliteUniqueConstraintError(error)) {
      throw new TagNameAlreadyTaken();
    }
    throw error;
  }
}
