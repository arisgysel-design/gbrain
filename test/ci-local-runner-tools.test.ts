import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('../scripts/ci-local.sh', import.meta.url), 'utf8');
const bootstrap = source.slice(source.indexOf('if ! command -v git '), source.indexOf('# Container runs as root'));

for (const git of [false, true]) {
  for (const ps of [false, true]) {
    test(`runner provisions required tools: git=${git}, ps=${ps}`, () => {
      expect(bootstrap).toContain('apt-get');
      const script = [
        'set -eu',
        `command() { case "$*" in '-v git') return ${git ? 0 : 1} ;; '-v ps') return ${ps ? 0 : 1} ;; *) return 1 ;; esac; }`,
        'apt-get() { printf "%s\\n" "$*" >&2; }',
        bootstrap,
      ].join('\n');
      const result = spawnSync('/bin/bash', ['-c', script], { encoding: 'utf8' });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe(git && ps ? '' : 'update -qq\ninstall -y -qq git ca-certificates procps\n');
    });
  }
}
