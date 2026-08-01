/**
 * Global Bun-test production database guard.
 *
 * A few legacy suites construct PostgresEngine directly instead of going
 * through test/e2e/helpers.ts. Guard every `bun test` process at preload time
 * so none of those paths can reach a production-looking database by accident.
 */
import { assertSafeTestDatabaseUrl } from './assert-safe-test-database.ts';

for (const key of [
  'DATABASE_URL',
  'GBRAIN_DATABASE_URL',
  'GBRAIN_DIRECT_DATABASE_URL',
] as const) {
  const url = process.env[key];
  if (!url) continue;
  try {
    assertSafeTestDatabaseUrl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${key}: ${message}`);
  }
}
