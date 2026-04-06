import BetterSqlite3 from 'better-sqlite3';
import type { KyselyConfig, LogEvent, Logger } from 'kysely';
import { Kysely, SqliteDialect } from 'kysely';
import type { DatabaseSettings } from 'csdm/node/settings/settings';
import type { Database } from './schema';
import { normalizeSqliteValue } from './normalize-sqlite-value';

export let db: Kysely<Database>;
let sqliteDatabase: BetterSqlite3.Database | undefined;

function isDateColumnType(type: string | null | undefined) {
  if (!type) {
    return false;
  }

  const normalizedType = type.toLowerCase();
  return (
    normalizedType === 'date' ||
    normalizedType === 'datetime' ||
    normalizedType === 'timestamp' ||
    normalizedType === 'timestamptz'
  );
}

function normalizeSqliteResultValue(value: unknown, type: string | null | undefined) {
  if (value === null || value === undefined || type === undefined || type === null) {
    return value;
  }

  if (type.toLowerCase() === 'boolean') {
    return value === 1 || value === true;
  }

  if (isDateColumnType(type) && !(value instanceof Date) && (typeof value === 'string' || typeof value === 'number')) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return value;
}

class SqliteStatementWrapper {
  private columnTypes = new Map<string, string | null | undefined>();

  public constructor(private statement: BetterSqlite3.Statement) {
    if (this.statement.reader) {
      for (const column of this.statement.columns()) {
        this.columnTypes.set(column.name, column.type);
      }
    }
  }

  public get reader() {
    return this.statement.reader;
  }

  private normalizeRow<T>(row: T): T {
    if (row === null || row === undefined || typeof row !== 'object' || Array.isArray(row)) {
      return row;
    }

    let hasChanged = false;
    const normalizedRow: Record<string, unknown> = {};
    for (const [columnName, value] of Object.entries(row)) {
      const normalizedValue = normalizeSqliteResultValue(value, this.columnTypes.get(columnName));
      normalizedRow[columnName] = normalizedValue;
      hasChanged = hasChanged || normalizedValue !== value;
    }

    return (hasChanged ? normalizedRow : row) as T;
  }

  public all(parameters: ReadonlyArray<unknown>) {
    return this.statement.all(parameters.map(normalizeSqliteValue)).map((row) => this.normalizeRow(row));
  }

  public get(parameters: ReadonlyArray<unknown>) {
    return this.normalizeRow(this.statement.get(parameters.map(normalizeSqliteValue)));
  }

  public run(parameters: ReadonlyArray<unknown>) {
    return this.statement.run(parameters.map(normalizeSqliteValue));
  }

  public iterate(parameters: ReadonlyArray<unknown>) {
    const iterator = this.statement.iterate(parameters.map(normalizeSqliteValue));
    const normalizeRow = this.normalizeRow.bind(this);

    return (function* () {
      for (const row of iterator) {
        yield normalizeRow(row);
      }
    })();
  }
}

class SqliteDatabaseWrapper {
  public constructor(private database: BetterSqlite3.Database) {}

  public close() {
    this.database.close();
  }

  public prepare(sql: string) {
    return new SqliteStatementWrapper(this.database.prepare(sql));
  }
}

export function getSqliteDatabase() {
  if (sqliteDatabase === undefined) {
    throw new Error('SQLite database has not been initialized yet');
  }

  return sqliteDatabase;
}

export function createDatabaseConnection(settings: DatabaseSettings) {
  const logger = globalThis.logger ?? console;
  try {
    sqliteDatabase?.close();
  } catch {
    // The previous connection may already have been closed through Kysely's destroy().
  }

  const sqliteOptions =
    process.env.CSDM_SQLITE_NATIVE_BINDING_PATH === undefined || process.env.CSDM_SQLITE_NATIVE_BINDING_PATH === ''
      ? undefined
      : {
          nativeBinding: process.env.CSDM_SQLITE_NATIVE_BINDING_PATH,
        };

  sqliteDatabase = new BetterSqlite3(settings.filePath, sqliteOptions);
  sqliteDatabase.pragma('foreign_keys = ON');
  sqliteDatabase.pragma('journal_mode = WAL');
  sqliteDatabase.pragma('busy_timeout = 10000');

  const dialect = new SqliteDialect({
    database: new SqliteDatabaseWrapper(sqliteDatabase),
  });

  let loggerFunction: Logger;
  if (process.env.LOG_DATABASE_QUERIES) {
    loggerFunction = (event: LogEvent) => {
      logger.log(event.query.sql);
      logger.log(event.query.parameters);
      if (event.level === 'error') {
        logger.log('Failed query:');
        logger.error(event.error);
      }
    };
  } else {
    loggerFunction = (event: LogEvent) => {
      if (event.level === 'error') {
        logger.log('Failed query:');
        logger.error(event.error);
      }
    };
  }

  const config: KyselyConfig = {
    dialect,
    log: loggerFunction,
  };

  db = new Kysely<Database>(config);
}
