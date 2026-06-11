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

### `version-monitor.yml`: monthly version monitor

Runs on a monthly schedule and opens a draft PR with the version bumps detected across npm, GitHub Actions, PHP, Node, WP-CLI, and container base images — the moving versions Dependabot does not cover. Minor and patch bumps are applied automatically; major bumps are listed in the PR body for manual review rather than applied. Re-runs in the same calendar month update the existing PR instead of opening a duplicate. Detection and patching run through `@rtcamp/wp-tooling version-monitor` (no third-party action).

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
    uses: rtCamp/shared-workflows/.github/workflows/version-monitor.yml@v1
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

The calling job must grant `permissions: contents: write` and `pull-requests: write` so the workflow can push the `version-monitor/YYYY-MM` branch and open the PR. Major bumps are never auto-applied — a bare version-string swap is rarely a safe major upgrade — so a month of only major bumps produces no diff and no PR; the run fails with the bump list in the log so they are surfaced rather than passing silently. The run also fails when a detector could not be checked (a PR may still carry the bumps that were found), so a scheduled run is never green while blind.

## License

GPL-2.0-or-later
