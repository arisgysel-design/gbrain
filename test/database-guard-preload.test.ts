/**
 * Regression: `bun test` itself must fail closed before a test file can use a
 * production-looking database URL, including suites that bypass E2E helpers.
 */
import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..');
const HERMETIC_TEST = 'test/error-classify.test.ts';

describe('database guard preload', () => {
  for (const key of [
    'DATABASE_URL',
    'GBRAIN_DATABASE_URL',
    'GBRAIN_DIRECT_DATABASE_URL',
  ] as const) {
    test(`rejects ${key} before the selected test file runs`, () => {
      const result = spawnSync('bun', ['test', HERMETIC_TEST], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          DATABASE_URL: '',
          GBRAIN_DATABASE_URL: '',
          GBRAIN_DIRECT_DATABASE_URL: '',
          GBRAIN_E2E_ALLOW_DB: '',
          [key]: 'postgresql://operator@db.example.test:5432/gbrain',
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(`${key}: Test database guard`);
      expect(result.stderr).toContain('does not look like a test database');
    });
  }
});
