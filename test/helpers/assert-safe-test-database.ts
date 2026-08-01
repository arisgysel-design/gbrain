/**
 * Refuse destructive test setup against databases that do not identify
 * themselves as disposable test databases.
 *
 * Pure and dependency-free so both the global Bun preload and E2E helpers can
 * call the same guard before any database client is imported or connected.
 */
export function assertSafeTestDatabaseUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
): void {
  let dbName: string;
  try {
    dbName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('Test database guard: URL is not parseable; refusing to run tests.');
  }
  if (!dbName) {
    throw new Error('Test database guard: URL has no database name; refusing to run tests.');
  }
  if (/(^|[_-])test([_-]|$)/i.test(dbName)) return;
  if (env.GBRAIN_E2E_ALLOW_DB && env.GBRAIN_E2E_ALLOW_DB === dbName) return;
  throw new Error(
    `Test database guard: database "${dbName}" does not look like a test database ` +
    `(expected "test" as a name segment, e.g. gbrain_test). Tests may ` +
    `TRUNCATE or DELETE data. If this is intentional, set ` +
    `GBRAIN_E2E_ALLOW_DB=${dbName} to opt in explicitly.`,
  );
}
