import path from 'node:path';
import { realpathSync, readFileSync } from 'node:fs';

/** Resolve a path inside a checked-out repository, including symlink boundaries. */
export function inside(root, relative) {
  if (path.isAbsolute(relative)) throw new Error(`Expected a relative path: ${relative}`);
  // Compare physical paths so a symlink cannot bypass the containment check.
  const target = realpathSync(path.resolve(root, relative));
  const rel = path.relative(realpathSync(root), target);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Path escapes the repository: ${relative}`);
  return target;
}

/** Apply the same repository-derived defaults locally and in GitHub Actions. */
export function settingsFor(repository, overrides = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Expected repository as owner/name');
  const [owner, name] = repository.split('/');
  const settings = {
    repository,
    sourceDirectory: '.',
    docsDirectory: 'docs',
    sourceRef: 'main',
    title: name,
    url: `https://${owner.toLowerCase()}.github.io`,
    // Owner sites live at /; project sites normally live beneath the repository name.
    baseUrl: name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${name}/`,
    // Optional workflow inputs arrive as empty strings and must not erase useful defaults.
    ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== '' && value !== undefined)),
  };
  // Forks may change source-link identity, but must retain the consumer's Pages identity.
  if (settings.repository !== repository) throw new Error('Settings cannot change repository identity');
  if (settings.sourceRepository && !/^[\w.-]+\/[\w.-]+$/.test(settings.sourceRepository)) throw new Error('Expected sourceRepository as owner/name');
  if (!/^https?:\/\/[^/]+\/?$/.test(settings.url)) throw new Error('url must be an HTTP(S) origin without a path');
  if (!/^\/([^?#]*\/)?$/.test(settings.baseUrl)) throw new Error('baseUrl must start and end with / and contain no query or fragment');
  return settings;
}

/** Keep branding declarative; filesystem paths are relative to the consumer project. */
export function loadBranding(project, configPath) {
  if (!configPath) return {};
  const branding = JSON.parse(readFileSync(inside(project, configPath), 'utf8'));
  if (!branding || typeof branding !== 'object' || Array.isArray(branding)) throw new Error('Branding must be a JSON object');
  // Limit the extension point to presentation settings rather than arbitrary build plugins.
  const allowed = ['tagline', 'favicon', 'navbar', 'footer', 'customCss', 'staticDirectory'];
  for (const key of Object.keys(branding)) {
    if (!allowed.includes(key)) throw new Error(`Unknown branding field: ${key}`);
  }
  // Resolve filesystem inputs here; favicon and navbar image values remain public site URLs.
  for (const key of ['customCss', 'staticDirectory']) {
    if (branding[key] !== undefined) branding[key] = inside(project, branding[key]);
  }
  return branding;
}

/** Load resolved CLI settings and safely locate the original documentation files. */
export function loadSettings() {
  if (!process.env.DOCS_SETTINGS || !process.env.DOCS_SOURCE) throw new Error('Use cli.mjs with --source');
  const settings = JSON.parse(readFileSync(process.env.DOCS_SETTINGS, 'utf8'));
  const source = realpathSync(process.env.DOCS_SOURCE);
  // Keep checkout and project roots distinct for monorepos and repository-relative edit links.
  const project = inside(source, settings.sourceDirectory);
  const docs = inside(project, settings.docsDirectory);
  return { ...settings, sourceRepository: settings.sourceRepository || settings.repository, source, docs, branding: loadBranding(project, settings.siteConfig) };
}
