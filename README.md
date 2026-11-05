# wp-shared-workflows

Reusable GitHub Actions workflows for rtCamp WordPress projects. Pure YAML — nothing to install.

## Quick start

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.ref || github.run_id }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
jobs:
  ci:
    uses: rtCamp/wp-shared-workflows/.github/workflows/wp-ci.yml@v1
    with:
      project-type: plugin   # plugin | theme | package
```

That is a complete CI setup: lint CSS/JS/PHP, Jest, PHPUnit, and build — each job gated on what
actually changed, so a docs-only PR runs almost nothing.

Trigger on `pull_request` plus `push` to `main` only. A bare `on: [push, pull_request]` runs
everything twice for every commit pushed to a pull request branch. The `concurrency` block cancels
a pull request's superseded run but lets every push to `main` finish, so each merged commit keeps
its status.

Every job runs on the runner the caller picks with the `runs-on` input, as JSON. It defaults to
GitHub-hosted `"ubuntu-latest"`. A reusable workflow's jobs run in the calling repository, so a public
repository cannot use rtCamp's self-hosted runners, while rtCamp's private repositories must (org
runner policy) and pass:

```yaml
    with:
      runs-on: '["self-hosted"]'
```

`wp-ci.yml` and `wp-cd.yml` forward it to every workflow they call.

Node comes from `.nvmrc` in `working-dir`, then the repository root, falling back to 22; set
`node-version` to override it. `wp-ci.yml` also forwards `php-version`, the Composer settings and a
`*-command` input per job, each falling back to that job's default when left empty.

### Coverage

Set `coverage: true` on `wp-ci.yml` to measure the lines each pull request changes, in `test-js`
and the first `test-php` matrix cell. The job fails when fewer than `coverage-threshold` percent
(default 80) of the changed executable lines are covered, writes a per-file table of missed lines
to its summary, and uploads the HTML report as a `coverage-php` / `coverage-js` artifact (suffixed
with the unit's directory in a monorepo). Add a
[`ci-coverage-comment.yml`](examples/ci-coverage-comment.yml) job to post the same summary on the
pull request; it needs `pull-requests: write`, which is why it is not part of `wp-ci.yml`.

New files only count once the test tool is told to include files no test loads: a
`<source><include>` block in `phpunit.xml.dist` (PHPUnit 10+, or
`<coverage processUncoveredFiles="true">` on 9) and `collectCoverageFrom` in the Jest config.
Under wp-env, coverage starts the tests environment (`.wp-env.tests.json` when present) with
Xdebug, and the default command becomes `npm run --ignore-scripts test:php --`, so a
`pretest:php` hook that restarts wp-env cannot drop Xdebug. A `test:php` script must pass its
extra arguments to PHPUnit.

### Branch protection

Require one check per `wp-ci.yml` call: `<caller job name> / CI result`, for example
`CI / CI result`, or `plugins/acme-blocks / CI result` for each unit of the matrix in
[`examples/wp-ci.yml`](examples/wp-ci.yml). It fails when any job failed, was cancelled or never
started, and passes when every job passed or was skipped by its own gate. Don't require the other
checks: which of them run, and their names, change with `project-type`, `skip`, the PHP matrix and
what a pull request touched, and a required check that never reports leaves the pull request
waiting forever.

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
| [`ci-coverage-comment.yml`](.github/workflows/ci-coverage-comment.yml) | Posts the changed-line coverage summaries of a run as one pull request comment | [example](examples/ci-coverage-comment.yml) |
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
| [`cd-github-release.yml`](.github/workflows/cd-github-release.yml) | GitHub Release from a tag + artifact, notes from `CHANGELOG.md`; attaches to the release instead when one exists | [example](examples/cd-github-release.yml) |
| [`cd-wp-org.yml`](.github/workflows/cd-wp-org.yml) | WordPress.org SVN deploy | [example](examples/cd-wp-org.yml) |
| [`cd-s3.yml`](.github/workflows/cd-s3.yml) | S3 upload + optional CloudFront invalidation | [example](examples/cd-s3.yml) |
| [`cd-built-branch.yml`](.github/workflows/cd-built-branch.yml) | Force-pushes source + generated output to a deploy branch | [example](examples/cd-built-branch.yml) |

#### With release-please

release-please creates the tag and the GitHub Release with `GITHUB_TOKEN`, which never starts an
`on: push: tags` workflow. Build and attach in the same workflow instead, gated on its output;
`cd-github-release.yml` sees the existing release and only uploads the zip:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  release-please:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    outputs:
      release-created: ${{ steps.release.outputs.release_created }}
      tag: ${{ steps.release.outputs.tag_name }}
    steps:
      - id: release
        uses: googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7 # v5.0.0

  build:
    needs: release-please
    if: needs.release-please.outputs.release-created == 'true'
    uses: rtCamp/wp-shared-workflows/.github/workflows/ci-build.yml@v1
    with:
      build-command: npm run build:prod && npm run package
      upload-artifact: true
      artifact-name: acme-blocks
      artifact-path: dist/acme-blocks

  release:
    needs: [release-please, build]
    permissions:
      contents: write
    uses: rtCamp/wp-shared-workflows/.github/workflows/cd-github-release.yml@v1
    with:
      tag: ${{ needs.release-please.outputs.tag }}
      artifact-name: acme-blocks
```

`release-please-action` reads `release-please-config.json` and `.release-please-manifest.json` from
the repository root. For a manifest package at a path, read
`steps.release.outputs['plugins/acme-blocks--release_created']` and `…--tag_name` instead.

With immutable releases enabled, a published release takes no new assets. Set `"draft": true` and
`"force-tag-creation": true` in `release-please-config.json`, and publish once the zip is attached:

```yaml
  publish:
    needs: [release-please, release]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Publish the draft release
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
          TAG: ${{ needs.release-please.outputs.tag }}
        run: gh release edit "$TAG" --draft=false
```

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
