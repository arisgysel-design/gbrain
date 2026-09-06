import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('../scripts/ci-local.sh', import.meta.url), 'utf8');
const bootstrap = source.slice(source.indexOf('if ! command -v git '), source.indexOf('# Container runs as root'));

for (const missing of ['git', 'ps', 'jq', 'python3', null]) {
  test(`runner provisions tools when missing: ${missing ?? 'none'}`, () => {
    expect(bootstrap).toContain('apt-get');
    const script = [
      'set -eu',
      `command() { [ "$*" != '-v ${missing}' ]; }`,
      'apt-get() { printf "%s\\n" "$*" >&2; }',
      bootstrap,
    ].join('\n');
    const result = spawnSync('/bin/bash', ['-c', script], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe(missing === null ? '' : 'update -qq\ninstall -y -qq git ca-certificates procps jq python3\n');
  });
}
