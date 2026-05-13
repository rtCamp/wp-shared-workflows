# shared-workflows

Reusable GitHub Actions workflows for rtCamp WordPress projects. Pure YAML — zero JavaScript. Consumed by every rtCamp repo via `uses: rtCamp/shared-workflows/.github/workflows/<name>.yml@v1`.

## What's inside

- CI workflows — lint (PHP / JS / CSS), test (PHPUnit / Jest / pa11y), build, detect-changes
- CI orchestrator — `wp-ci.yml` composes individual workflows based on `project-type` preset (plugin / theme / package)
- CD workflows — GitHub Release, WordPress.org SVN deploy, S3 artifact upload
- CD orchestrator — `wp-cd.yml`
- Version monitor — `version-monitor.yml` runs monthly and opens draft PRs for version bumps

## Development

See [`CLAUDE.md`](./CLAUDE.md) for workflow conventions, version-tag strategy, testing, and git workflow.

Per-issue progress lives in [`.claude/issues/`](./.claude/issues/). Claude skills live in [`.claude/commands/`](./.claude/commands/).

## Consumer example

```yaml
# .github/workflows/ci.yml in any rtCamp repo
name: CI
on: [push, pull_request]
jobs:
  ci:
    uses: rtCamp/shared-workflows/.github/workflows/wp-ci.yml@v1
    with:
      php-version: "8.3"
      node-version: "22"
      project-type: "plugin"
```

## Individual workflows

### `ci-build.yml` — production build

Runs the consumer's production build, with an optional artifact upload for downstream CD jobs. Default shape is build-only (no artifact written).

```yaml
# Node-only build — frontend-heavy plugin/theme (default shape)
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"

# Node-only build, hand the output to a downstream CD job
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
      upload-artifact: true

# Node + Composer — plugin that ships vendor/ alongside compiled JS
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
      install-composer-deps: true
      php-version: "8.3"
      upload-artifact: true

# Composer-only — pure PHP package, no JS toolchain
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      install-node-deps: false
      install-composer-deps: true
      php-version: "8.3"
      build-command: "composer run-script build"
```

| Input                   | Type    | Default                                                                                      | Description                                                                            |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `install-node-deps`     | boolean | `true`                                                                                       | Install Node dependencies before the build.                                            |
| `node-version`          | string  | `"22"`                                                                                       | Node.js version (used only when `install-node-deps` is true).                          |
| `install-composer-deps` | boolean | `false`                                                                                      | Install Composer dependencies before the build.                                        |
| `php-version`           | string  | `"8.3"`                                                                                      | PHP version (used only when `install-composer-deps` is true).                          |
| `composer-flags`        | string  | `"--no-dev --prefer-dist --optimize-autoloader --no-progress --no-interaction --no-scripts"` | Flags passed to `composer install`.                                                    |
| `build-command`         | string  | `"npm run build:prod"`                                                                       | Shell command that produces the production build.                                      |
| `upload-artifact`       | boolean | `false`                                                                                      | Upload the build output as a GitHub Actions artifact for downstream jobs.              |
| `artifact-name`         | string  | `"build"`                                                                                    | Artifact name. Must match the name in the downstream `actions/download-artifact` step. |
| `artifact-path`         | string  | `"build/"`                                                                                   | Path to upload. Resolved as `working-dir/artifact-path`.                               |
| `retention-days`        | number  | `7`                                                                                          | Days to keep the artifact before GitHub deletes it.                                    |
| `working-dir`           | string  | `"."`                                                                                        | Working directory for monorepos.                                                       |

A misconfigured `artifact-path` fails loudly (`if-no-files-found: error`) — no silent empty artifacts.

## License

GPL-2.0-or-later
