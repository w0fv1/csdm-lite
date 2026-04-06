export function normalizeSqliteValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return value;
}
