import { sql } from 'kysely';
import type { Migration } from '../migration';
import { insertDefaultTags } from 'csdm/node/database/tags/insert-default-tags';

const createTagsTable: Migration = {
  schemaVersion: 1,
  run: async (transaction) => {
    await transaction.schema
      .createTable('tags')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().notNull())
      .addColumn('name', 'varchar', (col) => col.notNull().unique())
      .addColumn('color', 'varchar', (col) => col.notNull())
      .execute();

    const deleteTrigger = sql`
    CREATE TRIGGER IF NOT EXISTS tag_deleted
    BEFORE DELETE
    ON tags
    FOR EACH ROW
    BEGIN
      DELETE FROM checksum_tags WHERE tag_id = OLD.id;
      DELETE FROM round_tags WHERE tag_id = OLD.id;
      DELETE FROM steam_account_tags WHERE tag_id = OLD.id;
    END;`;
    await deleteTrigger.execute(transaction);

    await insertDefaultTags(transaction);
  },
};

export default createTagsTable;
