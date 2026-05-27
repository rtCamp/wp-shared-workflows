# shared-workflows

Reusable GitHub Actions workflows for rtCamp WordPress projects. Pure YAML — zero JavaScript. Consumed by every rtCamp repo via `uses: rtCamp/shared-workflows/.github/workflows/<name>.yml@v1`.

## What's inside

- CI workflows — lint (PHP / JS / CSS), test (PHPUnit / Jest / pa11y), build, detect-changes
- CI orchestrator — `wp-ci.yml` composes individual workflows based on `project-type` preset (plugin / theme / package)
- CD workflows — GitHub Release, WordPress.org SVN deploy, S3 artifact upload
- CD orchestrator — `wp-cd.yml`
- Version monitor — `version-monitor.yml` runs monthly and opens draft PRs for version bumps

## version-monitor

Runs on a monthly schedule and opens a draft PR with any version bumps detected across npm, GitHub Actions, PHP, Node, WP-CLI, and container base images. Re-runs in the same calendar month update the existing PR rather than opening duplicates.

Requires a `.github/version-monitor.yml` config file in the calling repo. Minimal shape:

```yaml
sources:
  npm:        { enabled: true,  paths: [package.json] }
  actions:    { enabled: true,  paths: [.github/workflows/*.yml] }
  php:        { enabled: false }
  node:       { enabled: true,  paths: [.nvmrc, package.json] }
  wp-cli:     { enabled: false }
  container:  { enabled: false }

policy:
  draft_pr: true
  pr_label: "version-monitor"
  pr_assignees: []
  schedule: monthly
```

See [`@rtcamp/wp-tooling`](https://github.com/rtCamp/wp-tooling) for full config reference.

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `base-branch` | `string` | `main` | Branch to open the PR against |
| `pr-label` | `string` | `version-monitor` | Label applied to the draft PR |
| `pr-assignees` | `string` | `""` | Comma-separated GitHub usernames assigned to the PR |

### Caller example

See [`.github/workflows/_examples/caller-version-monitor.yml`](.github/workflows/_examples/caller-version-monitor.yml) for the full example. Minimum viable caller:

```yaml
jobs:
  run:
    uses: rtCamp/shared-workflows/.github/workflows/version-monitor.yml@v1
    with:
      base-branch: main
      pr-assignees: "alice,bob"
```

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

## License

GPL-2.0-or-later
