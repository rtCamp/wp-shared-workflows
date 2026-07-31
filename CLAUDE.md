# CLAUDE.md — `wp-shared-workflows`

Read this file at the start of every session. Topic-specific details live in [.claude/issues/](.claude/issues/) (per-task state) and [.claude/commands/](.claude/commands/) (skills). Read those only when the task requires.

---

## What this repo is

A pure GitHub Actions workflow repository for rtCamp WordPress projects. Provides reusable CI and CD building blocks consumed by every rtCamp repo via `uses: rtCamp/wp-shared-workflows/.github/workflows/<name>.yml@v1`. Zero JavaScript. Zero `node_modules`. Only YAML. Scripts that need logic live in `@rtcamp/wp-tooling` and are invoked through `npx wp-tooling <command>`.

---

## Non-negotiables

- No JavaScript files in this repo — not even one.
- No `package.json` — this is not a Node project.
- Every workflow uses `on: workflow_call` with typed inputs and outputs.
- Input names use `kebab-case` (`php-version`, not `phpVersion`).
- Every breaking change produces a new major version tag.
- Caller examples in `README.md` must actually work — tested against a consumer repo before merge.
- Deploy targets (WordPress.org, VIP, S3, custom) are separate workflows. The CD orchestrator picks based on caller input. No deploy path is hard-coded; consumers opt into each explicitly.

---

## Principle — prefer official WordPress tooling

When WordPress or `@wordpress/*` ships something that covers our need, we use it. Build custom only when there's a real gap — no official option, or the official option blocks a hard constraint (pinned input schema, project-type presets, etc.).

Use `actions/checkout`, `actions/setup-node`, `shivammathur/setup-php` (the community standard PHP action) over hand-rolled steps. For WordPress-specific tasks, prefer actions maintained by the WordPress or Automattic org over third-party ones.

Before adding any new action or step: check if an official option already exists. If it does, use that and layer rtCamp-specific overrides via inputs.

---

## Language & versions

| | |
|---|---|
| GitHub Actions | latest stable runners (`ubuntu-latest`) |
| Versioning | `@v1` / `@v1.2` / `@v1.2.3` tags |
| PHP in workflows | 8.3 (overridable per call) |
| Node in workflows | 22 (overridable per call) |

---

## Directory layout

```
.github/workflows/
  ci-detect-changes.yml         Pre-run: changed file detection (wraps the wp-tooling CLI)
  ci-lint-css.yml               Stylelint
  ci-lint-js.yml                ESLint + package.json validation
  ci-lint-php.yml               PHPCS + optional PHPStan
  ci-test-js.yml                Jest
  ci-test-php.yml               PHPUnit (wp-env or standalone)
  ci-test-a11y.yml              pa11y-ci WCAG2AA (opt-in via run-a11y)
  ci-build.yml                  Build + optional artifact
  ci-build-artifact-gate.yml    Fails a PR that commits build output
  ci-test-build-artifact.yml    Boots the packaged artifact in real WordPress
  wp-ci.yml                     CI orchestrator (project-type presets, one unit per call)
  cd-github-release.yml         GitHub Release from a tag + artifact
  cd-wp-org.yml                 WordPress.org SVN deploy
  cd-s3.yml                     S3 artifact upload (+ optional CloudFront invalidation)
  cd-built-branch.yml           Builds and force-pushes the built tree to a deploy branch
  cd-split-composer-packages.yml  Mirrors Composer subtrees to standalone repos
  wp-cd.yml                     CD orchestrator — deploy-target: github, wporg, s3
  version-monitor.yml           Monthly version check
README.md                       Caller examples — keep accurate
```

Deploy workflows are all optional. For tag-driven releases, consumers list which targets they want in the CD orchestrator call:

```yaml
uses: rtCamp/wp-shared-workflows/.github/workflows/wp-cd.yml@v1
with:
  deploy-target: "github,wporg"   # or "github,s3"
```

---

## Architecture patterns

Every reusable workflow follows this shape:

```yaml
name: <Human-readable name>
on:
  workflow_call:
    inputs:
      php-version:
        description: "PHP version to install"
        type: string
        default: "8.3"
      enable-phpstan:
        description: "Run PHPStan after PHPCS"
        type: boolean
        default: false
jobs:
  <job-id>:
    runs-on: ubuntu-latest
    steps:
      - name: <named step>
        ...
```

Orchestrators (`wp-ci.yml`, `wp-cd.yml`) compose individual workflows via `jobs.<id>.uses: ./.github/workflows/<name>.yml`. They never duplicate logic — if you find yourself copying from an individual workflow into an orchestrator, stop and refactor.

---

## Coding standards

- YAML indented 2 spaces, no tabs.
- Every input has a `description:` string — shown in GitHub UI when a caller configures.
- Every `step` has an explicit `name:` — never anonymous.
- Third-party actions pinned to a commit SHA, not a tag (supply-chain hygiene).
- Prefer built-in actions (`actions/checkout@v4`, `actions/setup-node@v4`) over third-party where possible.

---

## Testing

- Local dry-run: [`act`](https://github.com/nektos/act).
- Full integration test: push to a test branch in a throwaway consumer repo that references `@<your-branch>`.
- Every workflow merge is followed by a smoke test in at least one real consumer before tagging.

---

## Git workflow

- Every milestone has a long-lived release branch (`release/v1.0.0`). Never merge directly into `main`.
- Task branches: `v1.0.0/task/<kebab-slug>`, based on `release/v1.0.0`.
- Commit style: [Conventional Commits](https://www.conventionalcommits.org/) — `feat(ci): add lint-css workflow`.
- PR title: `[v1.0.0] <commit subject>`. PR target: `release/v1.0.0`.
- Squash merge. Never `--no-verify`.

### Version tag strategy

When `release/v1.0.0` merges to `main`:

| Change type | Action |
|---|---|
| Bug fix, no API change | move `@v1.2` + add `@v1.2.3` |
| New input with a default | add `@v1.3` + move `@v1` |
| Breaking change (input removed, renamed, required-now) | add `@v2` — do NOT move `@v1` |

---

## Working on an issue

When the user references a GitHub issue (`#13`, "the CI lint task"):

1. Check `.claude/issues/<N>-<slug>.md`.
2. **File exists** → the issue is in progress or complete. Read it for current state. Continue from there.
3. **File missing** → the issue has not been started. Copy `.claude/issues/_TEMPLATE.md` to `.claude/issues/<N>-<slug>.md`, fill `Summary` from the GitHub issue, set `status: in-progress`. Commit it as part of the first commit on the task branch.

Update this file as work progresses.

### Rotation protocol (seniors at 4h/day may rotate mid-issue)

- **Leaving an issue:** run `/handoff out` — Claude generates the log entry + a GitHub issue comment. Push WIP, apply `Status: Blocked`, post the comment.
- **Picking up an issue:** pull the branch, confirm your local `act` dry-run works, then `/handoff in`. Remove `Status: Blocked`, post the comment.
- Outgoing entry must be detailed enough that the incoming engineer needs **zero questions**.

---

## Available skills

- `/add-ci-workflow <purpose>` — scaffold a new `ci-<purpose>.yml` reusable workflow with inputs, outputs, and jobs
- `/add-cd-workflow <target>` — same for CD (`cd-<target>.yml`)
- `/review-workflow <path>` — audit for zero-JS rule, kebab-case inputs, typed schema
- `/generate-caller-example <workflow>` — produce the 10-line YAML a consumer pastes
- `/bump-workflow-version <workflow>` — decide patch/minor/major and update `README.md` caller examples
- `/handoff [out|in]` — generate a rotation handoff log entry + GitHub comment

---

## PR authoring

Use `.github/pull_request_template.md`. PR body mirrors the issue structure. Draft from the issue file.

Always include `Closes #<N>`.

---

## User preferences

- No auto-commits — the developer runs all `git` commands themselves.
- Brief, direct replies in chat.
- Don't create unsolicited documentation files.
- British English in prose.
