import { afterAll, beforeAll, expect, test } from 'bun:test';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import { buildChecks } from '../src/commands/doctor.ts';

let engine: PGLiteEngine;

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  await engine.executeRaw(
    `INSERT INTO files (filename, storage_path, mime_type, content_hash, metadata)
     VALUES ('example.png', 'cloud/example.png', 'image/png', 'example-hash', $1::text::jsonb)`,
    [JSON.stringify({ storage: 'supabase' })],
  );
});

afterAll(async () => { await engine.disconnect(); });

test('remote image objects are not diagnosed as missing local files', async () => {
  const checks = await buildChecks(engine, ['--scope=brain']);
  const assets = checks.find(check => check.name === 'image_assets');
  expect(assets).toBeDefined();
  expect(assets!.message).not.toContain('missing from disk');
  expect(assets!.message).not.toContain('restore from git');
  expect(assets!.message).toContain('remote');
  expect(assets!.message).toContain('gbrain files verify');
});

test('a remote image does not hide a missing local image', async () => {
  await engine.executeRaw(
    `INSERT INTO files (filename, storage_path, mime_type, content_hash, metadata)
     VALUES ('missing.png', 'missing-local/example.png', 'image/png', 'local-hash', $1::text::jsonb)`,
    [JSON.stringify({ storage: 'git' })],
  );
  try {
    const checks = await buildChecks(engine, ['--scope=brain']);
    const assets = checks.find(check => check.name === 'image_assets');
    expect(assets!.status).toBe('warn');
    expect(assets!.message).toContain('1 of 1 image(s) missing from disk');
    expect(assets!.message).toContain('1 remote image(s) not verified');
  } finally {
    await engine.executeRaw(`DELETE FROM files WHERE content_hash = 'local-hash'`);
  }
});
