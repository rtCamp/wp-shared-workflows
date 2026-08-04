# wp-shared-workflows

Reusable GitHub Actions workflows for rtCamp WordPress projects. Pure YAML — zero JavaScript. Consumed by every rtCamp repo via `uses: rtCamp/wp-shared-workflows/.github/workflows/<name>.yml@v1`.

## What's inside

- CI workflows — lint (PHP / JS / CSS), test (PHPUnit / Jest / pa11y), build, detect-changes
- CI orchestrator — `wp-ci.yml` composes individual workflows based on `project-type` preset (plugin / theme / package)
- CD workflows — GitHub Release, WordPress.org SVN deploy, S3 artifact upload, built-branch publish
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
permissions:
  contents: read
jobs:
  ci:
    uses: rtCamp/wp-shared-workflows/.github/workflows/wp-ci.yml@v1
    with:
      project-type: "plugin"   # plugin | theme | package
```

## Individual workflows

### `wp-ci.yml`: CI orchestrator

Call this once and it routes to the right subset of the individual CI workflows for your `project-type`. `detect-changes` runs first; every downstream job is gated on its per-bucket counts, so a PR that touched no PHP skips PHP lint and tests, and so on. A consumer adds a ~10-line caller and never wires the underlying workflows by hand.

```yaml
# .github/workflows/ci.yml in the consumer
name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  ci:
    uses: rtCamp/wp-shared-workflows/.github/workflows/wp-ci.yml@v1
    with:
      project-type: plugin   # plugin | theme | package
      # skip: "a11y"         # optional: comma-separated job ids
      # enable-phpstan: true # optional: run PHPStan after PHPCS
      # use-wp-env: false    # optional: standalone PHPUnit for a pure Composer library
      # run-a11y: ${{ contains(github.event.pull_request.labels.*.name, 'Run a11y') }} # optional: gate a11y on a label
      # Optional: fan PHPUnit across a PHP x WordPress grid. Under the default wp-env
      # each cell pins PHP + WordPress core; drop cells via test-php-exclude — each
      # {php, wp} must match a cell in the product. Omit all three for a single 8.3 leg.
      php-versions: '["8.1","8.2","8.3"]'
      wp-versions: '["6.7","6.8","6.9"]'
      test-php-exclude: '[{"php":"8.1","wp":"6.9"}]'
```

| Input              | Type    | Default      | Description                                                                                          |
| ------------------ | ------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `project-type`     | string  | —            | **Required.** `plugin` \| `theme` \| `package` — selects the job preset. Describes the unit at `working-dir`, not the repository. |
| `working-dir`      | string  | `"."`        | Directory holding the unit this call targets, relative to the repo root. `"."` is the repo root itself. |
| `skip`             | string  | `""`         | Comma-separated job ids to drop without forking the orchestrator. Disable PHP tests with `test-php` here — not an empty array. |
| `enable-phpstan`   | boolean | `false`      | Run PHPStan (whole-project) after PHPCS in `lint-php`.                                                |
| `run-a11y`         | boolean | `false`      | Run the `a11y` job. Off by default — slow and needs pa11y config. Gate it on the `Run a11y` label at the caller. |
| `use-wp-env`       | boolean | `true`       | Run `test-php` under `@wordpress/env`. Set `false` only for a pure Composer library that runs standalone PHPUnit. |
| `php-versions`     | string  | `["8.3"]`    | Non-empty JSON array of PHP versions; crossed with `wp-versions` to fan out `test-php`. Empty `[]` is a matrix error. |
| `wp-versions`      | string  | `[""]`       | JSON array of WordPress core versions for wp-env; crossed with `php-versions`. Empty string = `.wp-env.json` default; ignored when `use-wp-env: false`. |
| `test-php-exclude` | string  | `[]`         | JSON array of `{php, wp}` cells to drop from the product; both keys must match a cell.               |
| `build-artifact-path` | string | `""`      | Packaged installable plugin/theme dir the build produces (e.g. `dist/my-plugin/`). Set this to run the `build-artifact` install test; empty skips it. |
| `build-artifact-slug` | string | `""`      | Slug to activate in the `build-artifact` test. Empty uses `working-dir`'s basename, or the repo name when `working-dir` is `"."`. |
| `ignore-paths`     | string  | `""`         | Regex of paths `detect-changes` excludes from its counts and file lists. Empty uses the CLI's built-in ignore set. |
| `base-ref`         | string  | `""`         | Explicit git ref `detect-changes` diffs `HEAD` against. Empty lets the CLI resolve it from the PR base or push event. |
| `gated-paths`      | string  | `""`         | Newline-separated path prefixes (relative to `working-dir`) that must not be committed in a PR, e.g. `assets/build/`. Empty skips the `artifact-gate` job entirely. |
| `wp-tooling-ref`   | string  | pinned SHA   | Git ref of `rtCamp/wp-tooling`'s `npm/wp-tooling` branch that `detect-changes` installs the CLI from. Defaults to a pinned commit; override to track the branch tip. |

**Project-type presets** (a job also runs only when `detect-changes` reports the relevant bucket changed):

| Preset    | Jobs |
| --------- | ---- |
| `plugin`  | detect-changes, lint-css, lint-js, lint-php, test-js, test-php, build, build-artifact†, a11y‡, artifact-gate§ |
| `theme`   | detect-changes, lint-css, lint-js, lint-php, test-js, test-php, build, build-artifact†, a11y‡, artifact-gate§ |
| `package` | detect-changes, lint-php, test-php, artifact-gate§ |

† `build-artifact` runs only when `build-artifact-path` is set — the default `build` output is not an installable directory.
‡ `a11y` runs only when `run-a11y: true` — it is slow and needs pa11y config, so gate it on the `Run a11y` label at the caller.
§ `artifact-gate` runs only when `gated-paths` is set. It fails a PR that commits generated output, so it is opt-in — set it only where CI produces that output rather than the repo committing it.

Skippable job ids (for `skip`): `lint-css`, `lint-js`, `lint-php`, `test-js`, `test-php`, `build`, `build-artifact`, `a11y`, `artifact-gate`. `validate-inputs` and `detect-changes` always run and aren't skippable. Matching is comma-exact, so `skip: build` drops `build` but not `build-artifact`.

Notes:

- **Concurrency** — duplicate runs on the same ref (e.g. a force-push) are cancelled. The group includes `project-type` and `working-dir` (`ci-${{ github.ref }}-<project-type>-<working-dir>`) so that sibling calls do not cancel each other.
- **PHP / WordPress matrix** — `test-php` fans out over `php-versions` × `wp-versions` minus `test-php-exclude`. With `use-wp-env: true` (the default) each cell boots `@wordpress/env`, pinning `WP_ENV_PHP_VERSION` and `WP_ENV_CORE` — this suits plugins, themes, and packages whose suite tests against WordPress (e.g. via `wp-phpunit`), and the consumer needs a `.wp-env.json` plus `wp-env` and `test:php` npm scripts. A pure Composer library sets `use-wp-env: false` to run **standalone** PHPUnit (`vendor/bin/phpunit`), where the `wp` dimension is inert and no Node/Docker is required. Node defaults to 22; defaults run a single PHP 8.3 leg against the consumer's `.wp-env.json` WordPress version.
- **Static analysis & coverage** — PHPStan is off by default; opt in with `enable-phpstan: true`. The orchestrator does not yet produce a coverage report (a v1.x follow-up), so it does not fully replace a pipeline that gated on coverage.
- **`build-artifact`** — opt-in. Set `build-artifact-path` to the installable dir your build produces (the default `build` output is bare `build/`, not installable); the `build` job then uploads that path and `build-artifact` boots it in WordPress. `build-artifact-slug` overrides the activated slug (it defaults to `basename(working-dir)`, or the repo name when `working-dir` is `"."`); install path follows `project-type`.

### `version-monitor.yml`: monthly version monitor

Runs on a monthly schedule and opens a draft PR with the version bumps detected across npm, GitHub Actions, PHP, Node, WP-CLI, and container base images — the moving versions Dependabot does not cover. Minor and patch bumps are applied automatically; major bumps are listed in the PR body for manual review rather than applied. Re-runs in the same calendar month update the existing PR instead of opening a duplicate. Detection and patching run through `npx wp-tooling version-monitor`; the draft PR is opened and updated with [`peter-evans/create-pull-request`](https://github.com/peter-evans/create-pull-request) (SHA-pinned).

Requires a `.github/version-monitor.yml` config in the consumer repo listing which sources to watch — see [`@rtcamp/wp-tooling`](https://github.com/rtCamp/wp-tooling) for the full schema.

```yaml
# .github/workflows/version-monitor.yml in the consumer
name: Version Monitor
on:
  schedule:
    - cron: "0 6 1 * *"   # 06:00 UTC, first of each month
  workflow_dispatch:
jobs:
  monitor:
    permissions:
      contents: write
      pull-requests: write
    uses: rtCamp/wp-shared-workflows/.github/workflows/version-monitor.yml@v1
    with:
      base-branch: main
      pr-assignees: "Adi-ty"
```

| Input          | Type   | Default             | Description                                          |
| -------------- | ------ | ------------------- | ---------------------------------------------------- |
| `node-version` | string | `"22"`              | Node.js version used to install and run wp-tooling.  |
| `base-branch`  | string | `"main"`            | Branch the draft PR is opened against.               |
| `pr-label`     | string | `"version-monitor"` | Label applied to the draft PR.                       |
| `pr-assignees` | string | `""`                | Comma-separated GitHub usernames assigned to the PR. |
| `wp-tooling-ref` | string | pinned SHA | Git ref of `rtCamp/wp-tooling`'s `npm/wp-tooling` branch the CLI is installed from. Defaults to a pinned commit; override to track the branch tip. |

The calling job must grant `permissions: contents: write` and `pull-requests: write` so the workflow can push the `version-monitor/YYYY-MM` branch and open the PR, and the repo must have **Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"** enabled, or PR creation is blocked. Major bumps are never auto-applied — a bare version-string swap is rarely a safe major upgrade — so a month of only major bumps produces no diff and no PR; the run fails with the bump list in the log so they are surfaced rather than passing silently. The run also fails when a detector could not be checked (a PR may still carry the bumps that were found), so a scheduled run is never green while blind.

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
| `wp-tooling-ref` | string | pinned SHA | Git ref of `rtCamp/wp-tooling`'s `npm/wp-tooling` branch the CLI is installed from. Defaults to a pinned commit; override to track the branch tip. |
| `working-dir`  | string | `"."`   | Restricts the css/js/php counts and file lists to this directory, and makes those file lists relative to it. A **path scope, not a working directory** — the diff is always taken from the repo root. |

| Output                                            | Description                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `total-count` / `ignored-count`                   | Changed files kept after / dropped by the ignore filter. **Always repo-wide** — not restricted by `working-dir`. |
| `css-count` / `js-count` / `php-count` | Per-bucket change counts under `working-dir`. Gate downstream jobs on these.        |
| `gha-count` / `gha-files`         | Changed workflow files. **Always repo-wide** — workflow files only exist at `.github/workflows/` in the repo root, so scoping them would always yield nothing. |
| `css-files` / `js-files` / `php-files` | Newline-separated paths per bucket, **relative to `working-dir`**, ready for the lint workflows' `changed-files`. |

`@rtcamp/wp-tooling` is not on the npm registry yet, so the CLI is installed from the public `rtCamp/wp-tooling` repo's `npm/wp-tooling` branch, which carries the package at its root — no token needed. The install uses `--ignore-scripts`, and `wp-tooling-ref` defaults to a **pinned commit SHA** so a change on that branch cannot alter what your CI executes; override it to track the tip. The workflow runs unconditionally — count-based gating is the caller's (or orchestrator's) job, not the detector's.

> **Gate on the count, always.** An empty `changed-files` makes every lint workflow fall back to a whole-project run. Without the `if: … > 0` guard, a PR that touched no CSS would start the linter with nothing to do and it would silently lint the entire project instead of skipping.

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
| `working-dir`   | string | `"."`              | Directory the job runs in.                                                   |

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
| `working-dir`           | string  | `"."`             | Directory the job runs in.                                                   |

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
| `working-dir`      | string  | `"."`                                                            | Directory the job runs in.                                                       |

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
| `working-dir`           | string  | `"."`                                                                                        | Directory the job runs in.                                                             |

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
| `wp-version`     | string  | `""`                                                          | WordPress core version for wp-env, e.g. `"6.8"` (resolved as `WordPress/WordPress#<version>`). Empty uses the consumer's `.wp-env.json`. Ignored when `use-wp-env: false`. |
| `use-wp-env`     | boolean | `true`                                                        | Start `@wordpress/env` before tests for WordPress integration runs.        |
| `test-command`   | string  | `""`                                                          | PHPUnit command. Empty means `npm run test:php` in wp-env mode, `vendor/bin/phpunit` standalone. |
| `composer-flags` | string  | `"--no-interaction --prefer-dist --no-progress --no-scripts"` | Flags passed to `composer install`. Keep `--no-scripts` for supply-chain hygiene. |
| `working-dir`    | string  | `"."`                                                         | Directory the job runs in.                                                 |

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
| `working-dir`  | string  | `"."`                      | Directory the job runs in.                       |

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
| `working-dir`   | string | `"."`                  | Directory the job runs in.                                               |

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

| Input         | Type   | Default           | Description                                                                       |
| ------------- | ------ | ----------------- | --------------------------------------------------------------------------------- |
| `gated-paths` | string | `"assets/build/"` | Newline-separated path prefixes whose contents must not be committed in a PR.     |
| `working-dir` | string | `"."`             | Directory the gated path prefixes are anchored under.                             |

Only meaningful on `pull_request` events. On other triggers it logs a notice and exits 0 so the workflow stays inert outside PRs. The check compares `origin/<base>..HEAD` with `--diff-filter=ACMR`, so deletions are ignored: removing a previously-committed artifact in the PR does not trip the gate.

### `cd-split-composer-packages.yml`: split Composer packages to mirror repos

Splits Composer-package subtrees out of one repository into standalone mirror repos, so Packagist can serve each package from its own repository. A `splitsh.json` (by default at the repo root) is the single source of truth — to add or remove a package, edit that file, never the workflow.

`splitsh.json` lives in the **calling** repository (e.g. `wp-tooling`), not in this repo. As a reusable workflow, `actions/checkout` pulls the caller's repository by default, so the config is read from the caller's checkout — `config-file` is a path relative to that checkout, never the file's contents.

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
# .github/workflows/split.yml in the source repository
name: Split Composer Packages
on:
  push:
    tags: ["v*"]
jobs:
  split:
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-split-composer-packages.yml@v1
    with:
      tag: ${{ github.ref_name }}
    secrets:
      split-token: ${{ secrets.SPLIT_TOKEN }}
```

The reusable workflow owns no trigger of its own — the caller decides when it runs. To also allow a manual smoke-test run (the `workflow_dispatch` path the standalone version had), add the trigger and pass the tag through. On a manual run `github.ref_name` is a **branch**, not a tag, so the dispatch input must win:

```yaml
# .github/workflows/split.yml in the source repository
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
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-split-composer-packages.yml@v1
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

The `subtrees` map accepts both the shorthand string form (`"mirror": "path/in/repo"    `) and the object form (`"mirror": { "prefixes": [{ "from": "path" }] }`). Each subtree is force-pushed to its mirror in parallel with `fail-fast: false`, so one failing package does not abort the rest. A missing or empty config fails the run loudly.

### `cd-built-branch.yml`: publish the built tree to a deploy branch

Builds the project and force-pushes **source plus generated output** (Composer `vendor/`, compiled `assets/build/`) to a dedicated branch, for platforms that deploy from a git branch rather than an artifact.

Two invariants make this safe to point a production environment at:

- **The source branch never contains generated output.** Pair this workflow with `ci-build-artifact-gate.yml` on the *same* path list — whatever you gate, you publish.
- **The target branch is always one commit whose parent is the source commit.** So `git diff main..main-built` shows exactly the generated files and nothing else.

> **Requirements.** The caller must grant `permissions: contents: write` — a called workflow can only reduce the caller's grant, never raise it. The target branch must allow force-pushes. And note that **pushes made with the default `GITHUB_TOKEN` do not trigger further workflow runs**; if something must fire on a push to the deploy branch, supply `push-token`.

```yaml
# .github/workflows/publish-built-branch.yml in the consumer
name: Publish built branch
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  publish:
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-built-branch.yml@v1
```

That 12-line caller covers a single-plugin or single-theme repo: `targets` defaults to `[{"dir": "."}]`, and `vendor/` / `assets/build/` are inferred from the presence of `composer.json` and `package-lock.json`.

| Input             | Type    | Default              | Description                                                                                  |
| ----------------- | ------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `targets`         | string  | `[{"dir": "."}]`     | JSON array of build **objects**. Each needs `dir`; may override `name`, `php-version`, `node-version`, `composer-flags`, `build-command`, `publish-paths`, `verify-paths`, `composer`, `node`, `optional`. Per-target `publish-paths`/`verify-paths` accept either a JSON array (`["vendor","dist"]`) or a newline string. |
| `target-branch`   | string  | `"main-built"`       | Branch the built tree is force-pushed to. Must allow force-pushes.                           |
| `source-ref`      | string  | `""`                 | Commit/tag/branch to build. Empty uses the triggering commit. A full SHA rebuilds an older commit. |
| `publish-paths`   | string  | `""`                 | Newline-separated generated paths to publish, relative to each target's `dir`. Empty auto-resolves to `vendor/` (Composer targets) plus `assets/build/` (Node targets). |
| `verify-paths`    | string  | `""`                 | Newline-separated paths that must exist after the build. Files must exist; directories must be non-empty. Empty auto-resolves to `vendor/autoload.php` for Composer targets. |
| `node-version`    | string  | `"22"`               | Default Node.js version, overridable per target.                                             |
| `php-version`     | string  | `"8.3"`              | Default PHP version, overridable per target.                                                 |
| `composer-flags`  | string  | `--no-dev …`         | Flags passed to `composer install`.                                                          |
| `build-command`   | string  | `""`                 | Empty defaults to `npm run build:prod`. Only run for targets with a `package-lock.json`.     |
| `commit-subject`  | string  | `""`                 | Subject of the published commit. Empty uses `build: publish built tree for <short-sha>`.     |
| `allow-rewind`    | boolean | `false`              | Allow publishing a commit that is not a descendant of what the branch already publishes — a rollback, or a rebuild after the source branch was force-pushed. |
| `dry-run`         | boolean | `false`              | Build, verify and commit, but do not push.                                                   |
| `retention-days`  | number  | `3`                  | Days to keep the intermediate build tarballs.                                                |

| Secret           | Required | Description                                                                                  |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `push-token`     | no       | Token with `contents: write` used for the push. Supply one when the push must trigger further workflows, or when a ruleset needs a bypass actor. |

| Output          | Description                                                          |
| --------------- | ---------------------------------------------------------------------- |
| `published`     | `'true'` when a commit was pushed; `'false'` on a dry run.           |
| `published-sha` | SHA of the commit created on the target branch. Empty on a dry run.  |
| `source-sha`    | Resolved source commit that was built — the published commit's parent. |
| `targets`       | The resolved build matrix as compact JSON.                           |

**Rollback** is a `workflow_dispatch` with `source-ref: <full SHA>` **and** `allow-rewind: true`. Without the flag the dispatch is refused, since moving the deploy branch off a newer tree should be deliberate. Re-running an older run from the Actions UI does *not* roll back — a re-run cannot change these inputs, so it is indistinguishable from a run that lost a push race and it ends green without publishing.

**Losing a push race is not a failure.** If two pushes land close together and the newer run publishes first, the older run finds the branch already ahead of it, logs a `::notice::` and ends **green** without pushing — the correct tree is already live. Only an explicit `source-ref` rollback errors without `allow-rewind`.

Notes:

- **Every run rebuilds and republishes every target.** The branch must always be a complete deployable tree, and each run resets it to the source commit — so a skipped target would simply be absent, not stale. Consequently: **do not put a `paths:` filter on the push trigger.** A filtered-out commit leaves the branch's parent behind, and those changes never reach the deploy branch.
- **A target's `dir` must exist, or the run fails** — a typo'd or removed path never silently shrinks the published tree. To list a plugin or theme that has not been scaffolded yet, mark it `"optional": true`; an absent optional target is skipped with a `::warning::` and listed in the run summary instead of failing the run.
- **`node_modules/` is never published**, and listing it in `publish-paths` is a hard error. Only the declared paths are staged, so anything an npm lifecycle script wrote elsewhere stays out of the branch.
- **Nested `.git` directories inside published paths are removed** before staging. A dependency installed from source leaves one, and `git add` would record it as a gitlink — publishing an empty directory instead of the package's files.
- If the repo uses `* text=auto` in `.gitattributes`, add `vendor/** -text`. Line-ending normalisation is applied at `git add` time and can corrupt binary assets that lack a `binary` attribute.
- The branch's history is rewritten on every run, so old trees are orphaned until GitHub's GC runs; server-side repo size grows over time. That is inherent to build-to-branch.
- Not part of `wp-cd.yml`. That orchestrator is tag-and-artifact driven; this is push-and-self-building, and combining them would build the project twice.

**Setup:** point your branch-deploy platform at `main-built`, keep PR CI on `main`, and never commit to `main-built` by hand.

### `ci-test-build-artifact.yml`: boot the built artifact

A green `ci-build.yml` run only proves the build did not crash — not that the packaged output installs and boots. This workflow downloads the artifact, boots a real WordPress in [`@wordpress/env`](https://github.com/WordPress/gutenberg/tree/trunk/packages/env), activates the plugin/theme, and runs `wp doctor`. It catches PHP files referenced but never copied into the bundle, an over-eager `.distignore`, and path-cased files that break on Linux. Pair it with `ci-build.yml`.

**Plugin:** build with an uploaded artifact, then boot it.

```yaml
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      upload-artifact: true
      artifact-name: "plugin-dist"
      artifact-path: "dist/my-plugin/"   # a complete installable plugin dir, not bare build/
  test-artifact:
    needs: build
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-build-artifact.yml@v1
    with:
      artifact-name: "plugin-dist"
      slug: "my-plugin"
```

**Theme:** install under `wp-content/themes` and activate as a theme.

```yaml
jobs:
  test-artifact:
    needs: build
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-build-artifact.yml@v1
    with:
      artifact-name: "theme-dist"
      slug: "my-theme"
      install-path: "wp-content/themes"
```

| Input           | Type   | Default               | Description                                                                                       |
| --------------- | ------ | --------------------- | ------------------------------------------------------------------------------------------------- |
| `artifact-name` | string | _required_            | Artifact to download. Must match the `artifact-name` uploaded by `ci-build.yml` in the same run.   |
| `slug`          | string | _required_            | Plugin or theme directory slug to activate.                                                        |
| `node-version`  | string | `"22"`                | Node.js version used to run `@wordpress/env`.                                                      |
| `php-version`   | string | `"8.3"`               | PHP version wp-env boots with.                                                                     |
| `wp-version`    | string | `"latest"`            | WordPress version wp-env boots with. `latest` uses the newest stable release.                      |
| `install-path`  | string | `"wp-content/plugins"`| Destination under the WordPress root. A path ending in `themes` activates a theme, else a plugin.  |
| `smoke-script`  | string | `""`                  | Optional path inside the artifact to a shell script, run in the container after activation.        |
| `doctor-ignore-checks` | string | `"constant-wp-debug-falsy"` | Comma-separated `wp doctor` check names excluded from the error gate (production-oriented checks that wp-env's dev defaults always trip). |
| `working-dir`    | string | `"."`                 | Directory the job runs in. wp-env runs here       (so a `.wp-env.json` in this directory is picked up) and the artifact is downloaded into it. |

`wp doctor check --all` includes production-oriented checks that a dev wp-env always trips — notably `constant-wp-debug-falsy`, because wp-env enables `WP_DEBUG` by default. Those are excluded from the gate via `doctor-ignore-checks` (extend the comma-separated list if your wp-env config trips others); every other `error`-severity check still fails the build.

The run writes a `.wp-env.override.json` into `working-dir`, **overwriting any existing file of that name**. The override clears `plugins` and `themes` and mounts only the downloaded artifact, so the boot tests the packaged output rather than the working tree that a consumer's own `.wp-env.json` would map.

The artifact must be a **complete installable plugin/theme directory** (main PHP file plus assets), so point `ci-build.yml`'s `artifact-path` at a packaged dist directory, not bare `build/`. `actions/download-artifact` restores the uploaded directory contents uncompressed, so there is no unzip step. The workflow writes a `.wp-env.override.json` that pins `phpVersion`/`core` and mounts **only** the downloaded artifact — it clears `plugins`/`themes` from the consumer's `.wp-env.json` so the test reflects the packaged output in isolation, not the dev source tree. It then runs `wp <plugin|theme> activate <slug>` and `wp doctor check --all` (failing only on `error` severity), and always runs `wp-env stop` so no container leaks into the next job.

### `cd-github-release.yml`: GitHub Release

On a `v*.*.*` tag push, publishes a GitHub Release: the body is pulled from the matching `CHANGELOG.md` section, the named build artifact is attached, and `draft` / `prerelease` are honoured. Uses the `gh` CLI (no third-party action). Usually called by `wp-cd.yml`, but works standalone.

```yaml
# .github/workflows/release.yml in the consumer
name: Release
on:
  push:
    tags:
      - "v*.*.*"
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      upload-artifact: true
      artifact-name: "release"
  github-release:
    needs: build
    permissions:
      contents: write
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-github-release.yml@v1
    with:
      tag: ${{ github.ref_name }}
      artifact-name: "release"
```

| Input            | Type    | Default          | Description                                                                       |
| ---------------- | ------- | ---------------- | --------------------------------------------------------------------------------- |
| `tag`            | string  | _(required)_     | Tag that triggered the release, e.g. `v1.2.3`.                                    |
| `artifact-name`  | string  | _(required)_     | Build artifact to download and attach. Must match the producing job's name.       |
| `changelog-path` | string  | `"CHANGELOG.md"` | Changelog whose matching section becomes the release body.                        |
| `draft`          | boolean | `false`          | Create the Release as a draft.                                                    |
| `prerelease`     | boolean | `false`          | Mark the Release as a prerelease.                                                 |
| `working-dir`    | string  | `"."`            | Prefixes `changelog-path`. A **path prefix, not a working directory** — the attached files come from the artifact, which the build already scoped. |

The calling job must grant `permissions: contents: write`. The artifact must be produced **in the same workflow run** — `download-artifact` only sees the current run's artifacts. The changelog heading must contain the tag's version (`## v1.2.3` or `## [1.2.3]`, with an optional trailing date); `## Unreleased` is never matched. A missing or empty section fails the workflow rather than publishing a Release with no notes.

### `cd-wp-org.yml`: WordPress.org deploy

Deploys a plugin to the [WordPress.org plugin directory](https://plugins.svn.wordpress.org/) over SVN on a release tag, wrapping the standard [`10up/action-wordpress-plugin-deploy`](https://github.com/10up/action-wordpress-plugin-deploy) (SHA-pinned). Before deploying it fails fast unless `readme.txt`'s `Stable tag` matches the release tag, then syncs the build artifact to `trunk/` + `tags/<version>/` and the `assets-path` directory to SVN `/assets/`. `dry-run` runs everything except the final commit.

```yaml
# .github/workflows/deploy-wp-org.yml in the consumer
name: Deploy to WordPress.org
on:
  push:
    tags: ["v*.*.*"]
permissions:
  contents: read
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      upload-artifact: true
      artifact-name: wp-org-build
      # The artifact root must contain readme.txt, so point artifact-path at a
      # packaged plugin dir (not bare build/). Adjust build-command to whatever
      # produces that dir in your repo.
      build-command: "npm run build:prod"
      artifact-path: "dist/my-plugin/"
  deploy:
    needs: build
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-wp-org.yml@v1
    with:
      slug: my-plugin
      tag: ${{ github.ref_name }}
      artifact-name: wp-org-build
    secrets:
      WP_ORG_USERNAME: ${{ secrets.WP_ORG_USERNAME }}
      WP_ORG_PASSWORD: ${{ secrets.WP_ORG_PASSWORD }}
```

| Input           | Type    | Default            | Description                                                                  |
| --------------- | ------- | ------------------ | ---------------------------------------------------------------------------- |
| `slug`          | string  | _(required)_       | **Required.** Plugin slug on wordpress.org.                                  |
| `tag`           | string  | _(required)_       | **Required.** Release tag, e.g. `v1.2.3`. A leading `v` is stripped.         |
| `artifact-name` | string  | _(required)_       | **Required.** Build artifact to download and deploy (must match the producer). |
| `assets-path`   | string  | `".wordpress-org"` | Local directory mapped to SVN `/assets/`. Skipped if absent.                 |
| `dry-run`       | boolean | `false`            | Run the full deploy except the final SVN commit.                            |
| `working-dir`   | string  | `"."`              | Prefixes `assets-path`. A **path prefix, not a working directory** — the deployed files come from the artifact, which the build already scoped. |

| Secret            | Required | Description                                                            |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `WP_ORG_USERNAME` | yes      | WordPress.org account username with commit access to the plugin.     |
| `WP_ORG_PASSWORD` | yes      | WordPress.org account password.                                      |

Add the secrets under the consumer repo's **Settings → Secrets and variables → Actions**, then pass them through as shown above (reusable-workflow secrets are not inherited automatically).

Notes:

- **Same-run artifact** — `actions/download-artifact` only sees the current run's artifacts, so build and deploy must run in the same workflow (`deploy` `needs: build`).
- **Assets** are read from the *checked-out repo* at `assets-path` (not from the artifact); the build artifact supplies the plugin files for `trunk/`.
- **`Stable tag`** in `readme.txt` must equal the tag with any leading `v` removed (`v1.2.3` → `1.2.3`). Plugins using `Stable tag: trunk` are not supported by the strict check.
- **Immutable tags** — WordPress.org SVN tags are release snapshots; the deploy action errors (non-zero) if `tags/<version>` already exists, so re-deploying the same version fails rather than overwriting it.
- **`dry-run`** still checks out the live WP.org SVN repo for the slug; it only skips the commit, so exercising it end to end needs a real published slug.

### `cd-s3.yml`: S3 deploy

Distributes a private / customer plugin by uploading the build artifact to an S3 bucket on a release tag — a versioned object (`<prefix><tag>.zip`) plus a rolling `<prefix>latest.zip` that always overwrites — and optionally invalidates a CloudFront distribution so the new `latest.zip` is served immediately. Uses the official [`aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials) (SHA-pinned) and the preinstalled AWS CLI.

```yaml
# .github/workflows/deploy-s3.yml in the consumer
name: Deploy to S3
on:
  push:
    tags: ["v*.*.*"]
permissions:
  contents: read
jobs:
  build:
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      upload-artifact: true
      artifact-name: s3-build
      # build-command / artifact-path must produce exactly one .zip in the artifact.
  deploy:
    needs: build
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-s3.yml@v1
    with:
      tag: ${{ github.ref_name }}
      artifact-name: s3-build
      bucket: my-customer-bucket
      prefix: "plugins/my-plugin/"
      # cloudfront-distribution-id: "E123ABC"   # optional
    secrets:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

| Input                        | Type   | Default       | Description                                                              |
| ---------------------------- | ------ | ------------- | ------------------------------------------------------------------------ |
| `tag`                        | string | _(required)_  | **Required.** Release tag; the versioned object is keyed `<prefix><tag>.zip`. |
| `artifact-name`              | string | _(required)_  | **Required.** Build artifact to download (must match the producer).      |
| `bucket`                     | string | _(required)_  | **Required.** Target S3 bucket name.                                     |
| `prefix`                     | string | `""`          | Optional S3 key prefix, e.g. `plugins/myplugin/` (include the trailing slash). |
| `cloudfront-distribution-id` | string | `""`          | If set, invalidate `/<prefix>*` on this distribution after upload.       |
| `region`                     | string | `"us-east-1"` | AWS region of the bucket.                                                |

| Secret                  | Required | Description                      |
| ----------------------- | -------- | -------------------------------- |
| `AWS_ACCESS_KEY_ID`     | yes      | AWS access key id (see IAM below). |
| `AWS_SECRET_ACCESS_KEY` | yes      | AWS secret access key.           |

**Required IAM permissions.** The credentials need write access to the prefix, plus
`cloudfront:CreateInvalidation` only if you pass a distribution id:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-customer-bucket/plugins/my-plugin/*"
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<account-id>:distribution/E123ABC"
    }
  ]
}
```

Notes:

- **Same-run artifact** — `actions/download-artifact` only sees the current run's artifacts, so build and deploy must run in the same workflow (`deploy` `needs: build`), and the artifact must contain exactly one `.zip`.
- **Bucket region** should match `region`; otherwise `aws s3 cp` issues a redirect and runs slower.
- **Pre-existing infra** — the bucket and (if used) the CloudFront distribution must already exist; this workflow does not create or configure them.
- **`latest.zip` is CloudFront-cached** — the invalidation step is what makes "always-latest" actually serve the new build.

## License

GPL-2.0-or-later
