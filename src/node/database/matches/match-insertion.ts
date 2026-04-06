import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { parseFile } from '@fast-csv/parse';
import { glob } from 'csdm/node/filesystem/glob';
import type { DatabaseSettings } from 'csdm/node/settings/settings';
import type { Database } from 'csdm/node/database/schema';
import { getSqliteDatabase } from '../database';
import { normalizeSqliteValue } from '../normalize-sqlite-value';

export type InsertOptions = {
  databaseSettings: DatabaseSettings;
  outputFolderPath: string;
  demoName: string;
};

export function getOutputFolderPath() {
  return path.resolve(os.tmpdir(), 'cs-demo-manager');
}

export function getDemoNameFromPath(demoPath: string) {
  return path.parse(demoPath).name;
}

export function getCsvFilePath(outputFolderPath: string, demoName: string, csvFileSuffix: string) {
  return path.resolve(outputFolderPath, `${demoName}${csvFileSuffix}`);
}

type InsertFromCsvOptions<Table> = {
  databaseSettings: DatabaseSettings;
  csvFilePath: string;
  tableName: keyof Database;
  columns: Array<keyof Table>;
};

export async function insertFromCsv<Table>({ columns, csvFilePath, tableName }: InsertFromCsvOptions<Table>) {
  const sqlite = getSqliteDatabase();
  const columnNames = columns.map((column) => `"${String(column)}"`).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const statement = sqlite.prepare(`INSERT INTO "${String(tableName)}" (${columnNames}) VALUES (${placeholders})`);
  const tableInfo = sqlite.prepare(`PRAGMA table_info("${String(tableName)}")`).all() as Array<{
    name: string;
    type: string;
  }>;
  const columnTypes = columns.map((column) => {
    return tableInfo.find((info) => info.name === column)?.type.toLowerCase() ?? '';
  });

  await new Promise<void>((resolve, reject) => {
    let hasFailed = false;
    const rollbackAndReject = (error: unknown) => {
      if (hasFailed) {
        return;
      }

      hasFailed = true;
      try {
        sqlite.exec('ROLLBACK');
      } catch {
        // Ignore rollback failures, the original error is more useful.
      }

      reject(error);
    };

    sqlite.exec('BEGIN IMMEDIATE');

    const parser = parseFile(csvFilePath, { headers: false })
      .on('error', (error) => {
        rollbackAndReject(error);
      })
      .on('data', (row: string[]) => {
        try {
          const values = row.map((value, index) => {
            const type = columnTypes[index];
            if (type.includes('bool')) {
              return value === 'true' || value === '1' ? 1 : 0;
            }

            return normalizeSqliteValue(value);
          });

          statement.run(values);
        } catch (error) {
          parser.destroy(error as Error);
          rollbackAndReject(error);
        }
      })
      .on('end', () => {
        if (hasFailed) {
          return;
        }

        sqlite.exec('COMMIT');
        resolve();
      });
  });
}

export async function deleteCsvFilesInOutputFolder(outputFolderPath: string) {
  const files = await glob('*.csv', {
    cwd: outputFolderPath,
    absolute: true,
  });

  await Promise.all(files.map((csvFile) => fs.remove(csvFile)));
}
