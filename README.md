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

### Individual workflows

Each workflow is independently callable — wire them into your own job graph if the orchestrator preset doesn't fit. Defaults match the legacy `Test and Measure` workflow, so most consumers don't need any inputs.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test-js:
    uses: rtCamp/shared-workflows/.github/workflows/ci-test-js.yml@v1
```

Available inputs:

| Workflow | Input | Default |
|---|---|---|
| `ci-test-js.yml` | `node-version` | `"22"` |
| | `test-command` | `npm run test:js -- --ci` |
| | `enable-cache` | `true` |
| | `working-dir` | `"."` |

## License

GPL-2.0-or-later
