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

## License

GPL-2.0-or-later
