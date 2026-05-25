# Issue #20 — Add cd-split-packages reusable workflow (monorepo → mirror repos)

**Status:** in-review
**Branch:** `v1.0.0/task/cd-split-packages`
**PR:** #21
**Assignee:** @Adi-ty

---

## Summary

rtCamp's tooling lives in a monorepo, but Packagist serves each Composer package from its own repository with its own tags. This adds a reusable `workflow_call` workflow that splits each package subtree out into a standalone mirror repo (the Symfony "monorepo split" pattern) on a release tag, so every rtCamp monorepo shares one copy instead of copy-pasting the split logic. Derived from the working standalone `release-php.yml` in the tooling monorepo.

---

## Decisions made

- [2026-05-25] Modelled on the standalone `release-php.yml` (two-job `build-matrix` → matrixed `split`), converted to `on: workflow_call`. Core split logic (jq matrix, danharrin action, `fetch-depth: 0`) is byte-for-byte equivalent in behaviour.
- [2026-05-25] Inputs kept minimal: `tag` (default `""`) and `config-file` (default `"splitsh.json"`). `organization`/`branch`/`user_name`/`user_email` stay sourced from `splitsh.json` so it remains the single source of truth (Symfony pattern) — no redundant inputs.
- [2026-05-25] Secret `split-token` (required) reaches the danharrin action only via `env.GITHUB_TOKEN`; never echoed.
- [2026-05-25] `permissions: contents: read` at top level — the mirror push uses `split-token`, not the workflow's `GITHUB_TOKEN`, so read-only is sufficient and correct.
- [2026-05-25] Triggers move to the caller (a reusable workflow owns none). Tag resolution: explicit `tag` input wins, else `github.ref_name`. The `ref_name` fallback only covers the tag-push case — on `workflow_dispatch` `ref_name` is a branch, so the caller must pass the tag from its own dispatch input. Documented both caller shapes in the README.
- [2026-05-25] Hardening beyond the reference: fail loudly on missing config file / invalid JSON / empty `subtrees` (jq `// {}` guard avoids a null-deref on missing `subtrees`).
- [2026-05-25] Every action pinned to a commit SHA with a version comment: `actions/checkout@11bd719` (v4.2.2, matching the rest of the repo), `danharrin/monorepo-split-github-action@14e42e2` (v2.4.5, resolved from the tag).
- [2026-05-25] Named `cd-split-packages.yml` to sit in the CD family.

---

## Files changed so far

- `.github/workflows/cd-split-packages.yml` — new
- `README.md` — edited (new `cd-split-packages.yml` section: config shape, tag-push + dispatch caller examples, inputs + secret tables)
- `CHANGELOG.md` — edited (Unreleased entry)

---

## Verification run

```bash
❯ act workflow_call -W .github/workflows/cd-split-packages.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] ⭐ Run Set up job
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   ✅  Success - Set up job
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] ⭐ Run Main Checkout repository
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   ✅  Success - Main Checkout repository [6.708375ms]
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] ⭐ Run Main Parse config into a matrix
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   ✅  Success - Main Parse config into a matrix [21.030167ms]
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] ⭐ Run Main Echo resolved matrix
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   ✅  Success - Main Echo resolved matrix [17.754917ms]
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] ⭐ Run Complete job
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] Cleaning up container for job Build split matrix from config
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config]   ✅  Success - Complete job
*DRYRUN* [CD / Split Composer Packages/Build split matrix from config] 🏁  Job succeeded
ERRO[0000] Error while evaluating matrix: Invalid JSON: unexpected end of JSON input 
*DRYRUN* [CD / Split Composer Packages/Split                         ] ⭐ Run Set up job
*DRYRUN* [CD / Split Composer Packages/Split                         ] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CD / Split Composer Packages/Split                         ]   ✅  Success - Set up job
*DRYRUN* [CD / Split Composer Packages/Split                         ]   ☁  git clone 'https://github.com/danharrin/monorepo-split-github-action' # ref=14e42e2437f674b8987c1f50ca3689116aea1893
*DRYRUN* [CD / Split Composer Packages/Split                         ] ⭐ Run Main Checkout monorepo (full history)
*DRYRUN* [CD / Split Composer Packages/Split                         ]   ✅  Success - Main Checkout monorepo (full history) [9.643417ms]
*DRYRUN* [CD / Split Composer Packages/Split                         ] ⭐ Run Main Split and push subtree to mirror
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker build -t act-danharrin-monorepo-split-github-action-14e42e2437f674b8987c1f50ca3689116aea1893-dockeraction:latest /Users/adi/.cache/act/danharrin-monorepo-split-github-action@14e42e2437f674b8987c1f50ca3689116aea1893
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker pull image=act-danharrin-monorepo-split-github-action-14e42e2437f674b8987c1f50ca3689116aea1893-dockeraction:latest platform= username= forcePull=false
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker create image=act-danharrin-monorepo-split-github-action-14e42e2437f674b8987c1f50ca3689116aea1893-dockeraction:latest platform= entrypoint=[] cmd=["" "github.com" "" "" "" "" "" ""] network="container:act-CD--Split-Composer-Packages-Split-dc5f2bbaabb4c8d86f0a7386db3ec2a110255f2a742a58f5a5007f0ea266e004"
*DRYRUN* [CD / Split Composer Packages/Split                         ]   🐳  docker run image=act-danharrin-monorepo-split-github-action-14e42e2437f674b8987c1f50ca3689116aea1893-dockeraction:latest platform= entrypoint=[] cmd=["" "github.com" "" "" "" "" "" ""] network="container:act-CD--Split-Composer-Packages-Split-dc5f2bbaabb4c8d86f0a7386db3ec2a110255f2a742a58f5a5007f0ea266e004"
*DRYRUN* [CD / Split Composer Packages/Split                         ]   ✅  Success - Main Split and push subtree to mirror [41.679417ms]
*DRYRUN* [CD / Split Composer Packages/Split                         ] ⭐ Run Complete job
*DRYRUN* [CD / Split Composer Packages/Split                         ] Cleaning up container for job Split 
*DRYRUN* [CD / Split Composer Packages/Split                         ]   ✅  Success - Complete job
*DRYRUN* [CD / Split Composer Packages/Split                         ] 🏁  Job succeeded

# jq matrix confirmed on both value forms (shorthand + prefixes):
jq -c '{ include: [ .subtrees | to_entries[] | { mirror_repo: .key, package_directory: (if (.value|type)=="string" then .value else .value.prefixes[0].from end) } ] }' splitsh.json
{"include":[{"mirror_repo":"wp-phpcs","package_directory":"composer-packages/phpcs"},{"mirror_repo":"wp-phpstan","package_directory":"composer-packages/phpstan"}]}

```

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- **Optional hardening, not yet added (awaiting steer):** a guard in `build-matrix` that fails when the tag came from the `ref_name` fallback while `github.ref_type != 'tag'` — turns a silent "pushed a branch-named tag" (dispatch without an explicit tag) into a clear error.
- Mirror repos must already exist and `split-token` must hold `contents: write` on each for a real run to succeed.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
