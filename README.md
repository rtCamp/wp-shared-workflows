# wp-shared-workflows

Reusable GitHub Actions workflows for rtCamp WordPress projects. Pure YAML — nothing to install.

## Quick start

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  ci:
    uses: rtCamp/wp-shared-workflows/.github/workflows/wp-ci.yml@v1
    with:
      project-type: plugin   # plugin | theme | package
```

That is a complete CI setup: lint CSS/JS/PHP, Jest, PHPUnit, and build — each job gated on what
actually changed, so a docs-only PR runs almost nothing.

Every job runs on the runner the caller picks with the `runs-on` input, as JSON. It defaults to
GitHub-hosted `"ubuntu-latest"`. A reusable workflow's jobs run in the calling repository, so a public
repository cannot use rtCamp's self-hosted runners, while rtCamp's private repositories must (org
runner policy) and pass:

```yaml
    with:
      runs-on: '["self-hosted"]'
```

`wp-ci.yml` and `wp-cd.yml` forward it to every workflow they call.

## Workflows

Each workflow declares its inputs, secrets and outputs in its own `workflow_call` block, and GitHub
renders those descriptions when you wire up a caller. Every example is a complete consumer workflow
you can copy as-is.

### CI

| Workflow | What it does | Example |
|---|---|---|
| [`wp-ci.yml`](.github/workflows/wp-ci.yml) | CI orchestrator. One call per unit; routes to the right jobs for `project-type` | [example](examples/wp-ci.yml) |
| [`ci-detect-changes.yml`](.github/workflows/ci-detect-changes.yml) | Buckets changed files, exposes per-type counts and file lists | [example](examples/ci-detect-changes.yml) |
| [`ci-lint-css.yml`](.github/workflows/ci-lint-css.yml) | Stylelint | [example](examples/ci-lint-css.yml) |
| [`ci-lint-js.yml`](.github/workflows/ci-lint-js.yml) | ESLint + optional `package.json` validation | [example](examples/ci-lint-js.yml) |
| [`ci-lint-php.yml`](.github/workflows/ci-lint-php.yml) | PHPCS with `cs2pr` annotations + optional PHPStan | [example](examples/ci-lint-php.yml) |
| [`ci-test-js.yml`](.github/workflows/ci-test-js.yml) | Jest | [example](examples/ci-test-js.yml) |
| [`ci-test-php.yml`](.github/workflows/ci-test-php.yml) | PHPUnit, via `@wordpress/env` or standalone | [example](examples/ci-test-php.yml) |
| [`ci-test-a11y.yml`](.github/workflows/ci-test-a11y.yml) | pa11y-ci WCAG2AA | [example](examples/ci-test-a11y.yml) |
| [`ci-build.yml`](.github/workflows/ci-build.yml) | Production build + optional artifact upload | [example](examples/ci-build.yml) |
| [`ci-build-artifact-gate.yml`](.github/workflows/ci-build-artifact-gate.yml) | Fails a PR that commits build output | [example](examples/ci-build-artifact-gate.yml) |
| [`ci-test-build-artifact.yml`](.github/workflows/ci-test-build-artifact.yml) | Boots the packaged artifact in real WordPress | [example](examples/ci-test-build-artifact.yml) |

### CD

Each is opt-in — call the ones you need from your own release trigger, or fan out to several from
one `wp-cd.yml` call.

| Workflow | What it does | Example |
|---|---|---|
| [`wp-cd.yml`](.github/workflows/wp-cd.yml) | CD orchestrator. One call fans out to `github`, `wporg` and `s3` from `deploy-target` | [example](examples/wp-cd.yml) |
| [`cd-github-release.yml`](.github/workflows/cd-github-release.yml) | GitHub Release from a tag + artifact, notes from `CHANGELOG.md` | [example](examples/cd-github-release.yml) |
| [`cd-wp-org.yml`](.github/workflows/cd-wp-org.yml) | WordPress.org SVN deploy | [example](examples/cd-wp-org.yml) |
| [`cd-s3.yml`](.github/workflows/cd-s3.yml) | S3 upload + optional CloudFront invalidation | [example](examples/cd-s3.yml) |
| [`cd-built-branch.yml`](.github/workflows/cd-built-branch.yml) | Force-pushes source + generated output to a deploy branch | [example](examples/cd-built-branch.yml) |

### Maintenance

| Workflow | What it does | Example |
|---|---|---|
| [`version-monitor.yml`](.github/workflows/version-monitor.yml) | Monthly version-bump check that opens a draft PR | [example](examples/version-monitor.yml) |

## Versioning

Pin a version tag. `@v1` and `@v1.2` are aliases that move forward to compatible releases; an exact
`@v1.2.3` never changes.

| Pin | Resolves to |
|---|---|
| `@v1` | Latest `v1.x.y` — recommended |
| `@v1.2` | Latest patch of the `v1.2` line |
| `@v1.2.3` | One exact release |

Releases are cut by [release-please](https://github.com/googleapis/release-please) from the Conventional Commits merged to `main`.

Within a major version, inputs are only ever added, and always with a default. Removing or renaming
an input, or making one required, ships as a new major.

## Contributing

Conventions live in [AGENTS.md](AGENTS.md); the PR process is in [CONTRIBUTING.md](CONTRIBUTING.md).

Every example is verified in CI by [`bin/check-workflows.sh`](bin/check-workflows.sh): the `with:`
and `secrets:` keys must exist on the workflow being called, every required input must be supplied,
and the ref must be `@v1`. An example cannot silently drift out of date.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

<p align="center">
  <a href="https://rtcamp.com"><img src="https://n8e0ka87m9.gdcdn.us/kfnbt046p8/GitHub_Banner.webp" alt="rtCamp" width="100%"></a>
</p>
