import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settingsFor, inside } from './settings.mjs';

// Resolve the builder independently of the caller's working directory.
const root = path.dirname(fileURLToPath(import.meta.url));
const [command, ...args] = process.argv.slice(2);
const options = {};
const forwarded = [];
// Consume only wrapper options; pass flags such as --host and --out-dir to Docusaurus.
for (let i = 0; i < args.length; i++) {
  if (['--source', '--settings', '--repository'].includes(args[i])) {
    const key = args[i].slice(2);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing --${key} value`);
    options[key] = args[++i];
  } else forwarded.push(args[i]);
}
if (!['start', 'build', 'serve'].includes(command) || !options.source) {
  console.error('Usage: node cli.mjs <start|build|serve> --source <repository checkout> [--repository owner/name] [--settings site.json] [Docusaurus options]');
  process.exit(1);
}
const source = realpathSync(options.source);
const git = (...gitArgs) => execFileSync('git', ['-C', source, ...gitArgs], { encoding: 'utf8' }).trim();
// Prefer an explicit identity, then the Actions caller, then the local checkout's origin.
let repository = options.repository || process.env.GITHUB_REPOSITORY;
if (!repository) {
  const remote = git('remote', 'get-url', 'origin');
  const match = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error('Cannot infer GitHub repository; pass --repository owner/name');
  repository = match[1];
}
const overrides = options.settings ? JSON.parse(readFileSync(path.resolve(options.settings), 'utf8')) : {};
const settings = settingsFor(repository, {
  // PRs use the head branch; detached local checkouts fall back to a commit SHA.
  sourceRef: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git('branch', '--show-current') || git('rev-parse', 'HEAD'),
  // Explicit settings take precedence over the inferred source ref and site defaults.
  ...overrides,
});
// Fail before launching Docusaurus if the requested content escapes the consumer project.
inside(inside(source, settings.sourceDirectory), settings.docsDirectory);
// Share resolved settings with the config and sidebar modules without editing either checkout.
const temp = mkdtempSync(path.join(tmpdir(), 'docusaurus-settings-'));
const settingsPath = path.join(temp, 'site.json');
writeFileSync(settingsPath, JSON.stringify(settings));
// Keep settings for the child's lifetime; clean them up when build/start/serve returns.
try {
  // Use this Node runtime and the builder's dependencies, while reading consumer docs in place.
  const child = spawnSync(process.execPath, [path.join(root, 'node_modules/@docusaurus/core/bin/docusaurus.mjs'), command, ...forwarded], {
    cwd: root,
    env: { ...process.env, DOCS_SOURCE: source, DOCS_SETTINGS: settingsPath, NO_UPDATE_NOTIFIER: '1' },
    stdio: 'inherit',
  });
  if (child.error) throw child.error;
  // Preserve build failures for CI; a signal-terminated child has no numeric exit status.
  process.exitCode = child.status ?? 1;
} finally { rmSync(temp, { recursive: true, force: true }); }
