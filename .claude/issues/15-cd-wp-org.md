# Issue #15 — Add CD WP.org deploy workflow (`cd-wp-org.yml`)

**Status:** in-review <!-- in-progress | in-review | done -->
**Branch:** `v1.0.0/task/cd-wp-org`
**PR:** #26
**Assignee:** @Adi-ty

---

## Summary

Plugins on the WordPress.org directory deploy over SVN to `https://plugins.svn.wordpress.org/<slug>/` — a fiddly flow (trunk vs `tags/<version>`, the `/assets/` dir, `readme.txt` `Stable tag` validation). `cd-wp-org.yml` wraps the proven `10up/action-wordpress-plugin-deploy` so a consuming plugin skeleton deploys with one tag-triggered caller: it downloads the build artifact, fails fast unless `readme.txt`'s `Stable tag` matches the tag, then deploys to `trunk/` + `tags/<version>/` and syncs assets to SVN `/assets/`. It is the second CD workflow (with `cd-github-release.yml`) and the WP.org target the CD orchestrator (`wp-cd.yml`, #17) will call.

---

## Decisions made

- [2026-05-29] **No blocker — proceeded.** Runs entirely in the caller's repo with its own WP.org credentials. The issue's "depends on #11" is a *logical/runtime* dependency: the workflow only downloads an artifact by name (like `cd-github-release.yml`), with no code-level `uses:` on `ci-test-build-artifact`. The producer `ci-build.yml` is already merged. No private cross-repo dependency, no impossible-input blocker (unlike the deferred BC workflow).
- [2026-05-29] **Branched off `release/v1.0.0`** (needs nothing from detect-changes/lint); PR targets `release/v1.0.0`. No stacking.
- [2026-05-29] **Use `10up/action-wordpress-plugin-deploy@54bd289b8525fd23a5c365ec369185f2966529c2 # v2.3.0`, SHA-pinned.** Third-party, but no official WordPress/Automattic WP.org deploy action exists, so this is the de-facto standard — justified under CLAUDE.md's "build custom only when there's a real gap." Mandated by the issue.
- [2026-05-29] **Corrected the issue's reference snippet.** Verified against the action's `action.yml` + `deploy.sh` at 2.3.0: the only `with:` inputs are `generate-zip` and `dry-run`. Everything else is **environment variables** — `SVN_USERNAME`, `SVN_PASSWORD`, `SLUG`, `VERSION`, `ASSETS_DIR`, `BUILD_DIR`. The issue's `with: slug / assets-dir` would silently do nothing.
- [2026-05-29] **`VERSION` computed by us, not the action.** The action only strips a leading `v` when it *derives* `VERSION` from the git ref; a passed `VERSION` is used as-is. So the readme-verify step strips `v`, emits the bare version as a step output, and the deploy step passes it as `VERSION` — keeping it equal to the readme `Stable tag` and the SVN `tags/<version>`.
- [2026-05-29] **Artifact → `BUILD_DIR`.** The action rsyncs `$BUILD_DIR/` into `trunk/`; we download the artifact to `artifact/` and set `BUILD_DIR: artifact`. Assets are read from the *workspace* (`$GITHUB_WORKSPACE/$ASSETS_DIR/`), so the job also checks out the repo.
- [2026-05-29] **Injection-safe + fail-fast:** `tag` / `artifact-name` pass via step `env:` and are referenced as `$VARS`; nothing interpolated as `${{ inputs.* }}` inside a script. Missing `readme.txt`, missing `Stable tag:` header, or a mismatch each `::error::` + `exit 1` before the action runs (matches `cd-github-release.yml`).
- [2026-05-29] **`permissions: contents: read`** — only `checkout` reads the repo; the SVN deploy authenticates with the secrets, not the GitHub token.

---

## Files changed so far

- `.github/workflows/cd-wp-org.yml` — new (the workflow)
- `README.md` — edited (new `### cd-wp-org.yml` section under Individual workflows)
- `CHANGELOG.md` — edited (bullet under Unreleased → Added)
- `.claude/issues/15-cd-wp-org.md` — new (this file)

---

## Verification run

```bash
❯ pipx run yamllint .github/workflows/cd-wp-org.yml
❯ act workflow_call -W .github/workflows/cd-wp-org.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Set up job
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Set up job
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ☁  git clone 'https://github.com/actions/download-artifact' # ref=d3f86a106a0bac45b974a628896c90dbdf5c8093
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ☁  git clone 'https://github.com/10up/action-wordpress-plugin-deploy' # ref=54bd289b8525fd23a5c365ec369185f2966529c2
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Pre Deploy to WordPress.org
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Pre Deploy to WordPress.org [22.511292ms]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Main Checkout repository
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Main Checkout repository [6.783791ms]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Main Download build artifact
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Main Download build artifact [9.202ms]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Main Verify readme.txt stable tag matches the release tag
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Main Verify readme.txt stable tag matches the release tag [21.101542ms]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Main Deploy to WordPress.org
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Main /var/run/act/actions/10up-action-wordpress-plugin-deploy@54bd289b8525fd23a5c365ec369185f2966529c2/deploy.sh
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Main /var/run/act/actions/10up-action-wordpress-plugin-deploy@54bd289b8525fd23a5c365ec369185f2966529c2/deploy.sh [15.179166ms]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ⚙  ::set-output:: zip-path=
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Main Deploy to WordPress.org [52.698916ms]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Post Deploy to WordPress.org
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Post Deploy to WordPress.org [30.75µs]
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] ⭐ Run Complete job
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] Cleaning up container for job Deploy to WordPress.org
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org]   ✅  Success - Complete job
*DRYRUN* [CD / WordPress.org Deploy/Deploy to WordPress.org] 🏁  Job succeeded
```

yamllint clean; `act` resolves the full step graph (checkout → download-artifact → verify → 10up composite deploy).

readme `Stable tag` check (local awk unit-test, all pass): `Stable tag: 1.2.3` matches `tag: v1.2.3`; a mismatched tag, a `Stable tag: trunk`, and a missing `Stable tag:` header each exit 1; case-insensitive and CRLF/space-tolerant.

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- **`Stable tag: trunk` plugins are rejected** by the strict match.
- **Same-run artifact** — `download-artifact@v4` only sees the current run's artifacts; the model is build → deploy in one run (mirrors `cd-github-release.yml`).
- **Idempotent re-run** — the action exits 0 if `tags/<version>` already exists on WP.org.
- **Third-party action** — not WordPress/Automattic org, but no official option exists; SHA-pinned to v2.3.0 and tracked.
- **README merge order** — `cd-github-release.yml` (PR #24) also adds a section before `## License`; whichever merges second may need a trivial conflict resolution.
- **Action pins:** `actions/checkout@…v4.2.2`, `actions/download-artifact@…v4.3.0` (reuse the CD sibling's pins), `10up/action-wordpress-plugin-deploy@54bd289… # v2.3.0`.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
