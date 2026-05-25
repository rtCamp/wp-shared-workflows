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

### `ci-build.yml`: production build

Runs the consumer's production build, with an optional artifact upload for downstream CD jobs. Default shape is build-only (no artifact written).

**Node-only build (default):** frontend-heavy plugin or theme.

```yaml
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
```

**Node-only build with artifact upload:** hand the output to a downstream CD job.

```yaml
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
      upload-artifact: true
```

**Node + Composer:** plugin that ships `vendor/` alongside compiled JS.

```yaml
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
      install-composer-deps: true
      php-version: "8.3"
      upload-artifact: true
```

**Composer-only:** pure PHP package, no JS toolchain.

```yaml
jobs:
  build:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      install-node-deps: false
      install-composer-deps: true
      php-version: "8.3"
```

| Input                   | Type    | Default                                                                                      | Description                                                                            |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `install-node-deps`     | boolean | `true`                                                                                       | Install Node dependencies before the build.                                            |
| `node-version`          | string  | `"22"`                                                                                       | Node.js version (used only when `install-node-deps` is true).                          |
| `install-composer-deps` | boolean | `false`                                                                                      | Install Composer dependencies before the build.                                        |
| `php-version`           | string  | `"8.3"`                                                                                      | PHP version (used only when `install-composer-deps` is true).                          |
| `composer-flags`        | string  | `"--no-dev --prefer-dist --optimize-autoloader --no-progress --no-interaction --no-scripts"` | Flags passed to `composer install`.                                                    |
| `build-command`         | string  | `""`                                                                                         | Build command. Empty means `npm run build:prod` when `install-node-deps` is true, otherwise `composer run-script build`. |
| `upload-artifact`       | boolean | `false`                                                                                      | Upload the build output as a GitHub Actions artifact for downstream jobs.              |
| `artifact-name`         | string  | `"build"`                                                                                    | Artifact name. Must match the name in the downstream `actions/download-artifact` step. |
| `artifact-path`         | string  | `"build/"`                                                                                   | Path to upload. Resolved as `working-dir/artifact-path`.                               |
| `retention-days`        | number  | `7`                                                                                          | Days to keep the artifact before GitHub deletes it.                                    |
| `working-dir`           | string  | `"."`                                                                                        | Working directory for monorepos.                                                       |

A misconfigured `artifact-path` fails loudly via `if-no-files-found: error`. No silent empty artifacts.
### `ci-test-php.yml`: PHPUnit

Runs PHPUnit either against a real WordPress environment via [`@wordpress/env`](https://github.com/WordPress/gutenberg/tree/trunk/packages/env) (default) or standalone for Composer libraries.

**Plugin or theme:** WordPress integration tests via `wp-env` (default).

```yaml
jobs:
  test-php:
    uses: rtCamp/shared-workflows/.github/workflows/ci-test-php.yml@v1
    with:
      php-version: "8.3"
```

**Composer package:** standalone PHPUnit, no Node, no Docker.

```yaml
jobs:
  test-php:
    uses: rtCamp/shared-workflows/.github/workflows/ci-test-php.yml@v1
    with:
      php-version: "8.3"
      use-wp-env: false
```

| Input            | Type    | Default                                                       | Description                                                                |
| ---------------- | ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `php-version`    | string  | `"8.3"`                                                       | PHP version to install.                                                    |
| `node-version`   | string  | `"22"`                                                        | Node.js version. Consumed only when `use-wp-env: true`.                    |
| `use-wp-env`     | boolean | `true`                                                        | Start `@wordpress/env` before tests for WordPress integration runs.        |
| `test-command`   | string  | `""`                                                          | PHPUnit command. Empty means `npm run test:php` in wp-env mode, `vendor/bin/phpunit` standalone. |
| `composer-flags` | string  | `"--no-interaction --prefer-dist --no-progress --no-scripts"` | Flags passed to `composer install`. Keep `--no-scripts` for supply-chain hygiene. |
| `working-dir`    | string  | `"."`                                                         | Working directory for monorepos.                                           |
Each workflow can be called independently, so you can wire them into your own job graph if the orchestrator preset does not fit your setup.

### `ci-test-js.yml` — Jest tests

Runs JavaScript unit tests using Jest with optional transform/result caching across runs.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test-js:
    uses: rtCamp/shared-workflows/.github/workflows/ci-test-js.yml@v1
    with:
      node-version: "22"
```

| Input          | Type    | Default                    | Description                                      |
| -------------- | ------- | -------------------------- | ------------------------------------------------ |
| `node-version` | string  | `"22"`                     | Node.js version to install.                      |
| `test-command` | string  | `"npm run test:js -- --ci"`| Shell command that runs Jest.                    |
| `enable-cache` | boolean | `true`                     | Cache Jest transform/result data across runs.    |
| `working-dir`  | string  | `"."`                      | Working directory for monorepos.                 |

### `ci-test-a11y.yml` — accessibility tests

Runs `pa11y-ci` against the built site served by `@wordpress/env`. The reusable workflow is trigger-agnostic — wire the `Run a11y` label gate at the caller because a11y runs are slower than the rest of the CI matrix.

```yaml
# .github/workflows/ci.yml in the consumer
name: CI
on:
  pull_request:
    types: [labeled, synchronize, reopened]
jobs:
  test-a11y:
    if: contains(github.event.pull_request.labels.*.name, 'Run a11y')
    uses: rtCamp/shared-workflows/.github/workflows/ci-test-a11y.yml@v1
    with:
      node-version: "22"
```

| Input           | Type   | Default                | Description                                                              |
| --------------- | ------ | ---------------------- | ------------------------------------------------------------------------ |
| `node-version`  | string | `"22"`                 | Node.js version to install.                                              |
| `build-command` | string | `"npm run build:prod"` | Shell command that produces the production build pa11y will test against. |
| `test-command`  | string | `"npm run test:a11y"`  | Shell command that runs pa11y-ci.                                        |
| `working-dir`   | string | `"."`                  | Working directory for monorepos.                                         |

Step order is load-bearing: build runs **before** `wp-env start` so pa11y sees compiled CSS/JS. `wp-env stop` uses `if: always()` so a failing pa11y run does not leak a Docker stack into the next job.

## Individual workflows

### `ci-build-artifact-gate.yml`: block committed build artifacts

Fails a PR if it touches any file under the configured path prefixes (default: `assets/build/`). Pair it with `ci-build.yml` so the build output produced by CI is the only source of truth, never a stale tree committed by hand.

**Default:** gate `assets/build/` in a flat repo.

```yaml
jobs:
  artifact-gate:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build-artifact-gate.yml@v1
```

**Multiple gated paths:**

```yaml
jobs:
  artifact-gate:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build-artifact-gate.yml@v1
    with:
      gated-paths: |
        assets/build/
        dist/
        public/build/
```

**Monorepo:** scope the gate to one sub-package.

```yaml
jobs:
  artifact-gate:
    uses: rtCamp/shared-workflows/.github/workflows/ci-build-artifact-gate.yml@v1
    with:
      gated-paths: "assets/build/"
      working-dir: "packages/admin-ui"
```

| Input         | Type   | Default           | Description                                                                       |
| ------------- | ------ | ----------------- | --------------------------------------------------------------------------------- |
| `gated-paths` | string | `"assets/build/"` | Newline-separated path prefixes whose contents must not be committed in a PR.     |
| `working-dir` | string | `"."`             | Working directory for monorepos. Path prefixes are anchored under this directory. |

Only meaningful on `pull_request` events. On other triggers it logs a notice and exits 0 so the workflow stays inert outside PRs. The check compares `origin/<base>..HEAD` with `--diff-filter=ACMR`, so deletions are ignored: removing a previously-committed artifact in the PR does not trip the gate.

### `cd-split-packages.yml`: split Composer packages to mirror repos

Splits Composer-package subtrees out of a monorepo into standalone mirror repos (the Symfony "monorepo split" pattern), so Packagist can serve each package from its own repository. A `splitsh.json` at the repo root is the single source of truth — to add or remove a package, edit that file, never the workflow.

`splitsh.json` lives in the **calling** monorepo (e.g. `wp-tooling`), not in this repo. As a reusable workflow, `actions/checkout` pulls the caller's repository by default, so the config is read from the caller's checkout — `config-file` is a path relative to that checkout, never the file's contents.

`splitsh.json`:

```json
{
  "organization": "rtCamp",
  "subtrees": {
    "wp-phpcs": "composer-packages/phpcs",
    "wp-phpstan": "composer-packages/phpstan"
  },
  "defaults": {
    "branch": "main",
    "user_name": "github-actions[bot]",
    "user_email": "github-actions[bot]@users.noreply.github.com"
  }
}
```

Caller — split on every `v*` tag push:

```yaml
# .github/workflows/split.yml in the monorepo
name: Split Composer Packages
on:
  push:
    tags: ["v*"]
jobs:
  split:
    uses: rtCamp/shared-workflows/.github/workflows/cd-split-packages.yml@v1
    with:
      tag: ${{ github.ref_name }}
    secrets:
      split-token: ${{ secrets.SPLIT_TOKEN }}
```

The reusable workflow owns no trigger of its own — the caller decides when it runs. To also allow a manual smoke-test run (the `workflow_dispatch` path the standalone version had), add the trigger and pass the tag through. On a manual run `github.ref_name` is a **branch**, not a tag, so the dispatch input must win:

```yaml
# .github/workflows/split.yml in the monorepo
name: Split Composer Packages
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      test_tag:
        description: "Throwaway tag to push to mirrors (e.g. v0.0.0-test)"
        required: true
        default: "v0.0.0-test"
jobs:
  split:
    uses: rtCamp/shared-workflows/.github/workflows/cd-split-packages.yml@v1
    with:
      # Manual run → use the dispatch input; tag push → the pushed tag.
      tag: ${{ github.event.inputs.test_tag || github.ref_name }}
    secrets:
      split-token: ${{ secrets.SPLIT_TOKEN }}
```

| Input         | Type   | Default          | Description                                                                              |
| ------------- | ------ | ---------------- | ---------------------------------------------------------------------------------------- |
| `tag`         | string | `""`             | Tag to push to the mirror repos. When empty, falls back to the caller's `github.ref_name`. |
| `config-file` | string | `"splitsh.json"` | Path to the splitsh config file, relative to the repo root.                              |

| Secret        | Required | Description                                                                                            |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `split-token` | yes      | Token (fine-grained PAT or GitHub App token) with `contents: write` on every mirror repo in the config. |

The `subtrees` map accepts both the shorthand string form (`"mirror": "path/in/monorepo"`) and the object form (`"mirror": { "prefixes": [{ "from": "path" }] }`). Each subtree is force-pushed to its mirror in parallel with `fail-fast: false`, so one failing package does not abort the rest. A missing or empty config fails the run loudly.

## License

GPL-2.0-or-later
