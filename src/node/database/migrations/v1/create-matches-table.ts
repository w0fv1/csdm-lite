import { sql } from 'kysely';
import type { Migration } from '../migration';

const createMatchesTable: Migration = {
  schemaVersion: 1,
  run: async (transaction) => {
    await transaction.schema
      .createTable('matches')
      .ifNotExists()
      .addColumn('checksum', 'varchar', (col) => col.notNull().primaryKey())
      .addColumn('demo_path', 'varchar', (col) => col.notNull())
      .addColumn('game_type', 'integer', (col) => col.notNull())
      .addColumn('game_mode', 'integer', (col) => col.notNull())
      .addColumn('game_mode_str', 'varchar')
      .addColumn('is_ranked', 'boolean', (col) => col.notNull())
      .addColumn('kill_count', 'integer', (col) => col.notNull())
      .addColumn('death_count', 'integer', (col) => col.notNull())
      .addColumn('assist_count', 'integer', (col) => col.notNull())
      .addColumn('shot_count', 'integer', (col) => col.notNull())
      .addColumn('analyze_date', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('winner_name', 'varchar')
      .addColumn('winner_side', 'int2', (col) => col.notNull().defaultTo(0))
      .addColumn('overtime_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('max_rounds', 'integer', (col) => col.notNull().defaultTo(30))
      .addColumn('has_vac_live_ban', 'boolean', (col) => col.notNull().defaultTo(false))

      .execute();
  },
};

export default createMatchesTable;
