# wp-shared-workflows

Reusable GitHub Actions workflows for rtCamp WordPress projects. Pure YAML — zero JavaScript. Consumed by every rtCamp repo via `uses: rtCamp/wp-shared-workflows/.github/workflows/<name>.yml@v1`.

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
    uses: rtCamp/wp-shared-workflows/.github/workflows/wp-ci.yml@v1
    with:
      php-version: "8.3"
      node-version: "22"
      project-type: "plugin"
```

## Individual workflows

### `ci-detect-changes.yml`: changed-file detection

Buckets the files changed in a PR or push and exposes, per language bucket, both a **count** (for job gating) and the **exact file list** (for selective linting). Wraps the [`wp-tooling detect-changes`](https://github.com/rtCamp/wp-tooling) CLI — base-ref resolution and the bucket rules live there. Run it as a pre-run job, then feed its `*-files` outputs into the lint workflows so each one lints only what the PR touched.

```yaml
jobs:
  detect:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-detect-changes.yml@v1

  lint-css:
    needs: detect
    if: ${{ needs.detect.outputs.css-count > 0 }}
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-lint-css.yml@v1
    with:
      changed-files: ${{ needs.detect.outputs.css-files }}

  lint-php:
    needs: detect
    if: ${{ needs.detect.outputs.php-count > 0 }}
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-lint-php.yml@v1
    with:
      changed-files: ${{ needs.detect.outputs.php-files }}
```

| Input          | Type   | Default | Description                                                                                |
| -------------- | ------ | ------- | ------------------------------------------------------------------------------------------ |
| `node-version` | string | `"22"`  | Node.js version used to run the wp-tooling CLI.                                             |
| `ignore-paths` | string | `""`    | Regex of paths to exclude from counts and file lists. Empty uses the CLI's built-in ignore set. |
| `base-ref`     | string | `""`    | Explicit ref to diff `HEAD` against. Empty lets the CLI resolve it from the PR base or push event. |

| Output                                            | Description                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `total-count` / `ignored-count`                   | Changed files kept after / dropped by the ignore filter.                           |
| `css-count` / `js-count` / `php-count` / `gha-count` | Per-bucket change counts. Gate downstream jobs on these.                        |
| `css-files` / `js-files` / `php-files` / `gha-files` | Newline-separated paths per bucket, ready for the lint workflows' `changed-files`. |

wp-tooling is installed from its `release/v1.0.0` branch until it is published to a registry. The workflow runs unconditionally — count-based gating is the caller's (or orchestrator's) job, not the detector's.

### `ci-lint-css.yml`: Stylelint

Runs Stylelint over the project, or only over the files in `changed-files` when that input is non-empty.

```yaml
jobs:
  lint-css:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-lint-css.yml@v1
    with:
      node-version: "22"
```

| Input           | Type   | Default            | Description                                                                  |
| --------------- | ------ | ------------------ | ---------------------------------------------------------------------------- |
| `node-version`  | string | `"22"`             | Node.js version.                                                             |
| `lint-command`  | string | `"npm run lint:css"` | Whole-project Stylelint command. Used when `changed-files` is empty.       |
| `changed-files` | string | `""`               | Newline-separated CSS files to lint. Empty = run `lint-command` whole-project. |
| `working-dir`   | string | `"."`              | Working directory for monorepos.                                             |

### `ci-lint-js.yml`: ESLint

Runs ESLint, with optional `package.json` validation. `changed-files` scopes ESLint to just the listed files.

```yaml
jobs:
  lint-js:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-lint-js.yml@v1
    with:
      node-version: "22"
```

| Input                   | Type    | Default           | Description                                                                  |
| ----------------------- | ------- | ----------------- | ---------------------------------------------------------------------------- |
| `node-version`          | string  | `"22"`            | Node.js version.                                                             |
| `lint-command`          | string  | `"npm run lint:js"` | Whole-project ESLint command. Used when `changed-files` is empty.          |
| `changed-files`         | string  | `""`              | Newline-separated JS files to lint. Empty = run `lint-command` whole-project. |
| `validate-package-json` | boolean | `true`            | Run `npm run lint:package-json` before ESLint.                               |
| `working-dir`           | string  | `"."`             | Working directory for monorepos.                                             |

### `ci-lint-php.yml`: PHPCS + optional PHPStan

Runs PHPCS with `cs2pr` annotations and, when `enable-phpstan` is true, PHPStan. `changed-files` scopes **PHPCS** to the listed files; PHPStan always runs whole-project because it analyses cross-file dependencies.

```yaml
jobs:
  lint-php:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-lint-php.yml@v1
    with:
      php-version: "8.3"
      enable-phpstan: true
```

| Input              | Type    | Default                                                          | Description                                                                       |
| ------------------ | ------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `php-version`      | string  | `"8.3"`                                                          | PHP version.                                                                      |
| `enable-phpstan`   | boolean | `false`                                                          | Run PHPStan after PHPCS.                                                          |
| `phpcs-command`    | string  | `"vendor/bin/phpcs"`                                             | PHPCS binary path or custom command.                                             |
| `changed-files`    | string  | `""`                                                             | Newline-separated PHP files to lint with PHPCS. Empty = lint the whole project.  |
| `phpstan-command`  | string  | `"vendor/bin/phpstan analyse"`                                   | Shell command that runs PHPStan.                                                 |
| `phpstan-level`    | string  | `""`                                                             | Override PHPStan level. Empty uses the level from `phpstan.neon.dist`.            |
| `composer-flags`   | string  | `"--prefer-dist --optimize-autoloader --no-progress --no-interaction --no-scripts"` | Flags passed to `composer install`. Keeps `--no-scripts` for hygiene. |
| `validate-composer`| boolean | `true`                                                           | Run `composer validate` before installing.                                       |
| `working-dir`      | string  | `"."`                                                            | Working directory for monorepos.                                                 |


### `ci-build.yml`: production build

Runs the consumer's production build, with an optional artifact upload for downstream CD jobs. Default shape is build-only (no artifact written).

**Node-only build (default):** frontend-heavy plugin or theme.

```yaml
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
```

**Node-only build with artifact upload:** hand the output to a downstream CD job.

```yaml
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      node-version: "22"
      upload-artifact: true
```

**Node + Composer:** plugin that ships `vendor/` alongside compiled JS.

```yaml
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-php.yml@v1
    with:
      php-version: "8.3"
```

**Composer package:** standalone PHPUnit, no Node, no Docker.

```yaml
jobs:
  test-php:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-php.yml@v1
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-js.yml@v1
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-a11y.yml@v1
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build-artifact-gate.yml@v1
```

**Multiple gated paths:**

```yaml
jobs:
  artifact-gate:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build-artifact-gate.yml@v1
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build-artifact-gate.yml@v1
    with:
      gated-paths: "assets/build/"
      working-dir: "packages/admin-ui"
```

| Input         | Type   | Default           | Description                                                                       |
| ------------- | ------ | ----------------- | --------------------------------------------------------------------------------- |
| `gated-paths` | string | `"assets/build/"` | Newline-separated path prefixes whose contents must not be committed in a PR.     |
| `working-dir` | string | `"."`             | Working directory for monorepos. Path prefixes are anchored under this directory. |

Only meaningful on `pull_request` events. On other triggers it logs a notice and exits 0 so the workflow stays inert outside PRs. The check compares `origin/<base>..HEAD` with `--diff-filter=ACMR`, so deletions are ignored: removing a previously-committed artifact in the PR does not trip the gate.

## License

GPL-2.0-or-later
