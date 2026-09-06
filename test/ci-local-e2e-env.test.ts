import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('../scripts/ci-local.sh', import.meta.url), 'utf8');
const start = source.indexOf('echo "[runner] e2e (unsharded, --diff selected)"');
const selectedPhase = source.slice(start, source.indexOf("\nfi'", start) + 3);

test('selected E2E receives database opt-in and pooler targets on the consumer side of the pipe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gbrain-ci-env-'));
  const report = join(dir, 'report.txt');
  try {
    mkdirSync(join(dir, 'scripts'));
    writeFileSync(join(dir, 'scripts/run-e2e.sh'), [
      'set -eu',
      'printf "%s\\n" "$GBRAIN_TEST_DB" "$DATABASE_URL" "$GBRAIN_PGBOUNCER_URL" "$GBRAIN_PGBOUNCER_DIRECT_URL" "$@" > "$REPORT"',
    ].join('\n'));
    const result = spawnSync('/bin/bash', ['-c', [
      'set -eu',
      'bun() { printf "%s\\n" test/e2e/example.test.ts; }',
      selectedPhase,
    ].join('\n')], { cwd: dir, env: { PATH: process.env.PATH, REPORT: report }, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const [optIn, database, pooled, direct, file] = readFileSync(report, 'utf8').trim().split('\n');
    expect(optIn).toBe('1');
    expect(new URL(database).hostname).toBe('postgres-1');
    expect(new URL(database).pathname).toBe('/gbrain_test');
    expect(new URL(pooled).hostname).toBe('pgbouncer');
    expect(new URL(direct).hostname).toBe('postgres-1');
    expect(file).toBe('test/e2e/example.test.ts');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
