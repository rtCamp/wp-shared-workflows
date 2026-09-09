import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { settingsFor, inside, loadBranding } from './settings.mjs';

test('defaults derive from consumer identity and blank inputs retain defaults', () => {
  const result = settingsFor('rtCamp/wp-framework', { title: '', baseUrl: '' });
  assert.equal(result.title, 'wp-framework');
  assert.equal(result.url, 'https://rtcamp.github.io');
  assert.equal(result.baseUrl, '/wp-framework/');
  assert.equal(result.sourceDirectory, '.');
  assert.equal(result.docsDirectory, 'docs');
  assert.equal(settingsFor('rtCamp/rtcamp.github.io').baseUrl, '/');
});
test('fork source identity leaves site identity and Pages defaults unchanged', () => {
  const settings = settingsFor('example/project', { sourceRepository: 'contributor/project', sourceRef: 'docs-fix' });
  assert.equal(settings.repository, 'example/project');
  assert.equal(settings.sourceRepository, 'contributor/project');
  assert.equal(settings.baseUrl, '/project/');
  assert.equal(settings.url, 'https://example.github.io');
  assert.throws(() => settingsFor('example/project', { sourceRepository: 'invalid' }), /sourceRepository/);
});
test('branding resolves project assets and rejects escapes and unsupported settings', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'docs-branding-'));
  try {
    const project = path.join(root, 'project');
    mkdirSync(project);
    mkdirSync(path.join(project, 'assets'));
    writeFileSync(path.join(project, 'brand.css'), ':root { --docs-color-primary: red; }');
    const config = { tagline: 'Plugin handbook', navbar: { title: 'Handbook' }, customCss: 'brand.css', staticDirectory: 'assets' };
    const filename = path.join(project, 'branding.json');
    writeFileSync(filename, JSON.stringify(config));
    assert.deepEqual(loadBranding(project, 'branding.json'), { ...config, customCss: realpathSync(path.join(project, 'brand.css')), staticDirectory: realpathSync(path.join(project, 'assets')) });
    assert.deepEqual(loadBranding(project), {});
    writeFileSync(filename, JSON.stringify({ customCss: '../outside.css' }));
    writeFileSync(path.join(root, 'outside.css'), '');
    assert.throws(() => loadBranding(project, 'branding.json'), /escapes/);
    symlinkSync(path.join(root, 'outside.css'), path.join(project, 'escape.css'));
    writeFileSync(filename, JSON.stringify({ customCss: 'escape.css' }));
    assert.throws(() => loadBranding(project, 'branding.json'), /escapes/);
    writeFileSync(filename, JSON.stringify({ plugins: ['arbitrary-code'] }));
    assert.throws(() => loadBranding(project, 'branding.json'), /Unknown branding/);
    writeFileSync(filename, 'null');
    assert.throws(() => loadBranding(project, 'branding.json'), /JSON object/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('consumer overrides work and malformed settings fail', () => {
  const overrides = { title: 'Plugin', sourceDirectory: 'packages/plugin', docsDirectory: 'manual', url: 'https://docs.example.com', baseUrl: '/', sourceRef: 'develop' };
  assert.deepEqual(settingsFor('example/plugin', overrides), { repository: 'example/plugin', ...overrides });
  assert.throws(() => settingsFor('bad'), /owner\/name/);
  assert.throws(() => settingsFor('example/plugin', { baseUrl: 'bad' }), /baseUrl/);
  assert.throws(() => settingsFor('example/plugin', { url: 'https://example.com/docs' }), /origin/);
});
test('source paths cannot escape checkout through traversal or symlinks', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'docs-paths-'));
  try {
    mkdirSync(path.join(root, 'repo'));
    mkdirSync(path.join(root, 'outside'));
    symlinkSync(path.join(root, 'outside'), path.join(root, 'repo', 'escape'));
    assert.equal(inside(root, 'repo'), realpathSync(path.join(root, 'repo')));
    assert.throws(() => inside(path.join(root, 'repo'), '../outside'), /escapes/);
    assert.throws(() => inside(path.join(root, 'repo'), 'escape'), /escapes/);
    assert.throws(() => inside(root, root), /relative/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
