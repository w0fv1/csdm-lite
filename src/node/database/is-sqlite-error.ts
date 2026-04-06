type SqliteLikeError = Error & {
  code?: string;
};

export function isSqliteError(error: unknown): error is SqliteLikeError {
  return error instanceof Error && typeof (error as SqliteLikeError).code === 'string';
}

export function isSqliteUniqueConstraintError(error: unknown) {
  return isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT_UNIQUE';
}
