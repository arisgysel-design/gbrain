import { describe, expect, test } from 'bun:test';
import { isRemoteImageAsset, resolveImageAssetPath } from '../src/commands/doctor-asset-paths.ts';

describe('doctor remote image classification', () => {
  test('explicit cloud lanes never resolve to local paths', () => {
    for (const storage of ['supabase', 's3', 'r2']) {
      expect(isRemoteImageAsset({ storage })).toBe(true);
    }
  });
  test('git and local metadata override a remote default', () => {
    for (const storage of ['git', 'local']) {
      expect(isRemoteImageAsset({ storage }, { backend: 'supabase' })).toBe(false);
    }
  });
  test('legacy rows use the configured backend', () => {
    expect(isRemoteImageAsset({}, { backend: 'supabase' })).toBe(true);
    expect(isRemoteImageAsset(null, { backend: 's3' })).toBe(true);
    expect(isRemoteImageAsset({}, { backend: 'local' })).toBe(false);
    expect(isRemoteImageAsset({}, undefined)).toBe(false);
    expect(isRemoteImageAsset({}, 'invalid')).toBe(false);
  });
});

describe('doctor image asset path resolution', () => {
  test('uses the owning source local_path before the global sync fallback', () => {
    expect(resolveImageAssetPath(
      'images/example.jpg',
      '/brains/default-source',
      '/brains/other-source',
    ).abs).toBe('/brains/default-source/images/example.jpg');
  });

  test('falls back to sync.repo_path for legacy rows without a source root', () => {
    expect(resolveImageAssetPath(
      'images/example.jpg',
      null,
      '/brains/fallback',
    ).abs).toBe('/brains/fallback/images/example.jpg');
  });

  test('keeps absolute storage paths unchanged', () => {
    expect(resolveImageAssetPath(
      '/var/lib/gbrain/example.jpg',
      '/brains/default-source',
      '/brains/fallback',
    ).abs).toBe('/var/lib/gbrain/example.jpg');
  });
});
