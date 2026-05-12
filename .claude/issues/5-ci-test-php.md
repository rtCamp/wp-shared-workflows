# Issue #5 — Add PHP unit tests reusable workflow

**Status:** in-progress
**Branch:** `v1.0.0/task/ci-test-php`
**PR:** #6
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project that ships PHP currently copy-pastes the same `unit-test-php` job from the legacy `Test and Measure` workflow. Some consumers need a full WordPress integration environment via `@wordpress/env`; Composer-only packages and libraries do not. This task adds `ci-test-php.yml` — a single reusable workflow with a `use-wp-env` toggle that covers both modes so every consumer can adopt one canonical implementation via `uses: rtCamp/shared-workflows/.github/workflows/ci-test-php.yml@v1`.

---

## Decisions made

- [2026-05-12] `php-version` gets a default of `"8.3"` rather than `required: true` — matches CLAUDE.md ("PHP in workflows: 8.3, overridable per call") and the input-design convention adopted in the lint-trio PR. `required: true` is reserved for unguessable identity (deploy slugs, bucket names) on future CD workflows.
- [2026-05-12] `composer-flags` default carries `--no-scripts` — supply-chain hygiene, mirrors `ci-lint-php.yml`. Consumers that need post-install scripts must opt in explicitly by overriding the input.
- [2026-05-12] `npm ci` is split into its own step gated on `use-wp-env`. The planning doc combined `npm ci && composer install`; that breaks standalone mode because there is no Node setup. Composer install always runs; npm install only when wp-env is enabled.
- [2026-05-12] `coverage: none` on `shivammathur/setup-php` — skips the Xdebug install cost. Coverage is a follow-up concern (will become a `coverage` input flipping Xdebug/PCOV on, plus Codecov / artifact upload).
- [2026-05-12] `tools: composer` on `shivammathur/setup-php` — pins Composer explicitly so we do not rely on whatever `ubuntu-latest` happens to ship.
- [2026-05-12] `wp-version` input deferred. `WP_ENV_CORE` works but needs a format transform (`6.7` → `WordPress/WordPress#tags/6.7`); writing `.wp-env.override.json` clobbers consumer overrides. Both are sharp edges and the legacy workflow did not expose this — defer to a clean follow-up issue.
- [2026-05-12] No Composer or wp-env caching in v1.0.0. Composer install is fast relative to wp-env Docker pulls; wp-env caching is genuinely tricky (Docker layer cache vs `~/.wp-env`). Both can be added later without breaking the input schema.
- [2026-05-12] Drive-by fix to `.yamllint.yml` line 14 (bracket spacing) — same starter-kit bug surfaces here as it did on the ci-test-js branch. yamllint would otherwise fail on the very file that defines its own rules.

### Action SHA pins recorded

- `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` — v4.2.2.
- `actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af` — v4.1.0.
- `shivammathur/setup-php@accd6127cb78bee3e8082180cb391013d204ef9f` — 2.37.0 (annotated tag dereferenced via `gh api repos/.../git/tags/<tag-object-sha>`).

---

## Files changed so far

- `.github/workflows/ci-test-php.yml` — new
- `.claude/issues/5-ci-test-php.md` — new
- `CHANGELOG.md` — new (first entry under `## Unreleased`)
- `README.md` — edited (caller example + inputs row)
- `.yamllint.yml` — edited (drive-by bracket-spacing fix on line 14)

---

## Verification run

```bash
$ pipx run yamllint .
# (clean exit)
```

`act --dryrun` not run locally — `act` is not installed on this machine. Full end-to-end verification deferred to a smoke-test consumer repo with `@wordpress/env`, `composer.json`, and a passing PHPUnit fixture; reviewer to confirm during PR review.

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- The biggest deviation from the planning doc is the **split `npm ci` / `composer install` steps**. The doc's combined step would fail in standalone mode (no Node = `npm ci` cannot run). Splitting is cheap and keeps the dependency graph honest.
- `wp-version` is intentionally absent from v1.0.0. If reviewers want it shipped now, the cleanest wire is `env: WP_ENV_CORE: WordPress/WordPress#tags/${{ inputs.wp-version }}` on the wp-env start step, gated on the input being non-empty. Happy to fold that in if requested — flagging here so it is a conscious decision rather than an oversight.
- Same `.yamllint.yml` bracket-spacing fix lives in the other open PR. Whichever PR merges second will conflict on that single line.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
