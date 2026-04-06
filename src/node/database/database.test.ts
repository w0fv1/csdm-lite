import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createDatabaseConnection, db, getSqliteDatabase } from './database';
import { normalizeSqliteValue } from './normalize-sqlite-value';

describe('SQLite database wrapper', () => {
  let tempFolderPath = '';
  let databaseFilePath = '';

  beforeEach(async () => {
    tempFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), 'csdm-sqlite-test-'));
    databaseFilePath = path.join(tempFolderPath, 'test.sqlite');

    createDatabaseConnection({
      filePath: databaseFilePath,
    });
  });

  afterEach(async () => {
    await db?.destroy();
    await fs.rm(tempFolderPath, { recursive: true, force: true });
  });

  it('should normalize SQLite boolean result values to JavaScript booleans', async () => {
    const sqliteDatabase = getSqliteDatabase();
    sqliteDatabase.exec(`
      CREATE TABLE matches (
        is_ranked boolean NOT NULL,
        has_vac_live_ban boolean NOT NULL
      );
    `);
    sqliteDatabase
      .prepare(`
      INSERT INTO matches (
        is_ranked,
        has_vac_live_ban
      ) VALUES (?, ?)
    `)
      .run(1, 0);

    const match = await db.selectFrom('matches').select(['is_ranked', 'has_vac_live_ban']).executeTakeFirstOrThrow();

    expect(match.is_ranked).toBe(true);
    expect(typeof match.is_ranked).toBe('boolean');
    expect(match.has_vac_live_ban).toBe(false);
    expect(typeof match.has_vac_live_ban).toBe('boolean');
  });

  it('should normalize SQLite timestamp result values to Date instances', async () => {
    const sqliteDatabase = getSqliteDatabase();
    sqliteDatabase.exec(`
      CREATE TABLE demos (
        date timestamptz NOT NULL
      );
    `);
    sqliteDatabase
      .prepare(`
      INSERT INTO demos (
        date
      ) VALUES (?)
    `)
      .run('2026-04-04T15:39:56.000Z');

    const demo = await db.selectFrom('demos').select(['date']).executeTakeFirstOrThrow();

    expect(demo.date).toBeInstanceOf(Date);
    expect(demo.date.toISOString()).toBe('2026-04-04T15:39:56.000Z');
  });
});

describe('normalizeSqliteValue', () => {
  it('should convert booleans to SQLite integers', () => {
    expect(normalizeSqliteValue(true)).toBe(1);
    expect(normalizeSqliteValue(false)).toBe(0);
  });

  it('should convert Date objects to ISO strings', () => {
    const date = new Date('2026-04-04T15:39:56.000Z');

    expect(normalizeSqliteValue(date)).toBe('2026-04-04T15:39:56.000Z');
  });
});
