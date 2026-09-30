## Dev environment tips

```bash
brew install actionlint yq jq                                        # the only tooling this repo needs
```

Nothing to build, no `package.json`, no `node_modules`. Every file here is YAML or Bash.

### Key Directories

- `.github/workflows/ci-*.yml` — CI leaves: `detect-changes`, `lint-{css,js,php}`, `test-{js,php,a11y}`, `build`, `build-artifact-gate`, `test-build-artifact`
- `.github/workflows/wp-ci.yml` — CI orchestrator; composes the leaves and routes by `project-type`
- `.github/workflows/cd-*.yml` — opt-in deploy leaves: `github-release`, `wp-org`, `s3`, `built-branch`
- `.github/workflows/wp-cd.yml` — optional CD orchestrator; fans out to `github-release`, `wp-org` and `s3` by `deploy-target`
- `.github/workflows/version-monitor.yml` — monthly version-bump check that opens a draft PR
- `.github/workflows/ci-self-check.yml` — this repo's own CI; the only workflow not `on: workflow_call`
- `examples/<name>.yml` — exactly one caller example per workflow, matched by filename
- `bin/check-workflows.sh` — enforces the examples contract and the conventions below

## Progressive discovery

Read only what your task needs, when it needs it:

- **Input contracts**: a workflow's own `on.workflow_call` block is the source of truth for its inputs, secrets and outputs. Nothing duplicates it — GitHub renders those `description:` fields when a consumer wires up a caller.
- **Consumer view**: `README.md` carries the workflow index and the tag a consumer should pin.
- **Contributor docs**: `CONTRIBUTING.md` for the PR checklist.

## Code quality

```bash
pipx run yamllint .                                                  # style
actionlint .github/workflows/*.yml examples/*.yml                    # workflow correctness
bin/check-workflows.sh                                               # examples match the workflows
act workflow_call -W .github/workflows/<name>.yml --dryrun           # plan one workflow locally (Docker)
```

The first three run in CI via `ci-self-check.yml`. Every workflow follows this shape:

```yaml
name: CI / Lint PHP
on:
  workflow_call:
    inputs:
      php-version:
        description: "PHP version to install"
        type: string
        default: "8.3"
jobs:
  lint-php:
    name: Lint PHP
    runs-on: [self-hosted]
    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

- 2-space indent, `kebab-case` input names, a `description:` on every input, a `name:` on every job and step. `bin/check-workflows.sh` enforces all four.
- Third-party actions pinned to a commit SHA with a trailing `# vX.Y.Z` comment.
- Every job runs on `runs-on: [self-hosted]`. rtCamp policy puts private repos on self-hosted runners, and a reusable workflow's jobs run in the caller's repo, so this is the consumer's runner too. `bin/check-workflows.sh` applies the org runner-policy allow-list (`self-hosted`, `high-performance`, `macOS`, `self-hosted-arm64`); use plain `[self-hosted]`, since every pool it reached in testing was linux-x64 and the pinned binaries this repo downloads are x86_64.
- Caller values reach a `run:` body through step `env:`, never through `${{ }}` interpolation. `bin/check-workflows.sh` enforces this — interpolation is still fine in `env:`, `with:` and `if:`, which are not shell. Two shapes:

**Value inputs** (`composer-flags`, `phpstan-level`, `changed-files`) become argv, so shell metacharacters stay literal:

```yaml
      - name: Install Composer dependencies
        shell: bash
        env:
          COMPOSER_FLAGS: ${{ inputs.composer-flags }}
        run: |
          set -euo pipefail
          read -r -a composer_args <<< "$COMPOSER_FLAGS" || true
          composer install "${composer_args[@]}"
```

**Command inputs** (`build-command`, `test-command`, `*-command`) *are* shell — running them is the contract, not a leak. Routing them through `env:` stops render-time splicing, where a newline in the value injects extra lines into the generated script and a quote corrupts the command after it:

```yaml
      - name: Build production assets
        shell: bash
        env:
          BUILD_COMMAND: ${{ inputs.build-command }}
        run: bash -eo pipefail -c "$BUILD_COMMAND"
```

Use `bash -eo pipefail -c`, never bare `bash -c`: `-e` is not inherited, so a bare `bash -c "false; echo x"` exits **0** and a failing build passes green. Those flags reproduce GitHub's own `shell: bash` default. `-u` is deliberately omitted — GitHub does not set it either, and it would break consumer commands that reference unset variables. Append arguments as quoted positionals so they cannot be re-parsed as shell:

```yaml
        run: |
          set -eo pipefail
          args=()
          [ -z "$PHPSTAN_LEVEL" ] || args+=("--level=$PHPSTAN_LEVEL")
          bash -eo pipefail -c "$PHPSTAN_COMMAND \"\$@\"" _ "${args[@]}"
```

## Architectural decisions

- **A tagged workflow is public API**: inputs, secrets and outputs are consumed by every rtCamp repo pinned at `@v1`. A renamed input breaks them at workflow-validation time, before a single job starts. Additive changes only within a major; removals, renames and newly-required inputs ship as a new major.
- **Orchestrator plus leaves**: `wp-ci.yml` composes the CI leaves via `jobs.<id>.uses`, so a consumer wires up one job instead of ten. `wp-cd.yml` is the optional CD counterpart: one call fans out to `cd-github-release`, `cd-wp-org` and `cd-s3` from a single `deploy-target`, but every `cd-*` leaf stays independently callable from a consumer's own release trigger. `cd-built-branch.yml` builds its own output instead of consuming an artifact, so it is standalone only.
- **One unit per call**: `project-type` describes the unit at `working-dir`, not the repository. A repo with two plugins and a theme calls `wp-ci.yml` three times, usually via a matrix in the caller. Sibling calls don't cancel each other, and each derives its own artifact name.
- **Everything gated on what changed**: `ci-detect-changes.yml` buckets the diff and every downstream job keys off it, so a docs-only PR runs almost nothing.
- **Logic that needs a real language lives elsewhere**: `@rtcamp/wp-tooling`, invoked as `npx wp-tooling <command>`. Repo-local automation is Bash under `bin/`.
- **Examples are executable documentation**: one per workflow, verified in CI, comment-free, pinned `@v1`. They target a `wp-content`-shaped monorepo because that is the shape people get wrong. Anything consuming a build artifact shows the producing `ci-build` job and the `needs:` edge in the same file.
- **Prefer official tooling**: `actions/checkout`, `actions/setup-node`, `shivammathur/setup-php`, and WordPress/Automattic-maintained actions over third-party ones.

## Common pitfalls

- `working-dir` carries three different meanings. On the CI leaves it is a real working directory — tools install and run inside it. On `ci-detect-changes.yml` it is a **path scope**: the diff is always taken from the repository root, then the CSS/JS/PHP lists are filtered and re-rooted, while `total-count`, `ignored-count` and the `gha-*` outputs stay repo-wide. On `cd-github-release.yml` and `cd-wp-org.yml` it is a **path prefix** for source files they read (`changelog-path`, `assets-path`); the deployed files come from the artifact, and `wp-cd.yml` forwards it to both unchanged. `cd-built-branch.yml` scopes per entry in its `targets` JSON array, and `cd-s3.yml` by the artifact it downloads.
- `actions/download-artifact` only sees the current run. Anything consuming a build artifact must run in the same workflow as the `ci-build` job that produced it, wired with `needs:`.
- The default `wp-tooling-ref` SHA is duplicated in `ci-detect-changes.yml`, `wp-ci.yml` and `version-monitor.yml`. Changing one without the others silently splits behaviour across jobs.
- The self-hosted runners are ARC pods on Ubuntu 24.04 x64 with a minimal image, not GitHub's `ubuntu-latest`. They have `git`, `curl`, `jq`, `zip`, `rsync`, `python3`, `gh` and `docker`, but no `yq`, `pip`, `aws` or `svn`, and no Node or PHP until `setup-node`/`setup-php` run. `/usr/local/bin` needs `sudo`, which is passwordless. Install what a step needs, pinned and checksum-verified, as `ci-self-check.yml` does for `actionlint` and `yq` and `cd-s3.yml` does for the AWS CLI. apt's `yq` is kislyuk's jq wrapper, not the mikefarah `yq` this repo uses.
- `actionlint` shells out to whatever `shellcheck` is on `PATH`, and rule behaviour differs between shellcheck releases — a local pass does not guarantee a CI pass. Write shell that is clean on older versions too: prefer `guard || continue` and explicit `if` blocks over `A && B || C`, which SC2015 flags on shellcheck 0.10 and earlier.
- A green `bin/check-workflows.sh` proves input *names* are right, not input *values*. A wrong `build-command` or `artifact-path` only surfaces in a real consumer run.
- `cd-github-release.yml` extracts release notes by matching a version heading in `CHANGELOG.md`, and deliberately fails rather than publishing empty notes. Cut `## Unreleased` to `## vX.Y.Z - YYYY-MM-DD` before tagging.
- Consumers pin `@v1`, never a branch such as `@release/v1.0.0`. A moving ref has already broken real consumer runs mid-change.

## PR instructions

- Task branches `<version>/task/<kebab-slug>` off the active release branch. Never commit to `main`.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat(ci): add lint-css workflow`.
- PR title `[<version>] <subject>`, targeting the release branch. Squash merge; release branch → `main` is a merge commit.
- Ensure the Code quality commands pass, the caller example is updated alongside the workflow, and a `CHANGELOG.md` entry is added — see `CONTRIBUTING.md` for the full checklist.
- Ask first before removing or renaming an input, adding a deploy target, or granting a job `contents: write` it does not already need.
