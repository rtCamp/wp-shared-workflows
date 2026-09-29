# Contributing to wp-shared-workflows

Thanks for your interest in improving `rtCamp/wp-shared-workflows`. This repository ships **workflow
contracts** rather than application code: the moment a workflow is tagged, its inputs, secrets and
outputs are public API, and every rtCamp repo pinned at `@v1` picks up the change on its next run. A
renamed input is not a refactor — it breaks every consumer at workflow-validation time, before a
single job starts. Treat the input surface as stable.

## Ground rules

- **Conventions live in [AGENTS.md](AGENTS.md).** Read it before your first change — it covers the
  repo layout, the shape every workflow follows, and the coding standards CI enforces.
- **Every workflow has exactly one caller example** at `examples/<same-name>.yml`. Add or update it
  in the same PR; CI fails otherwise.
- **Repo-local automation is Bash** under `bin/`. Logic that needs a real language belongs in
  [`@rtcamp/wp-tooling`](https://github.com/rtCamp/wp-tooling) and is invoked via `npx wp-tooling`.
- **Third-party actions are pinned to a commit SHA** with a trailing `# vX.Y.Z` comment.

## Development setup

There is nothing to build. Install the linters once:

```bash
brew install actionlint yq jq        # or your platform's equivalent
```

## Before you open a PR

The first three must exit `0`; they are the same checks CI runs:

```bash
pipx run yamllint .                                              # style
actionlint .github/workflows/*.yml examples/*.yml                # workflow correctness
bin/check-workflows.sh                                           # examples match the workflows
act workflow_call -W .github/workflows/ci-build.yml --dryrun     # plan one workflow locally
```

`bin/check-workflows.sh` is the one that matters most: it proves every example passes only inputs and
secrets its workflow actually declares, supplies every required one, and is pinned at `@v1`. It also
enforces kebab-case input names, input descriptions and named steps.

`act` needs a running Docker daemon. `--dryrun` resolves the job graph and prints the steps it would
run without executing them, which is the closest you can get to a real runner locally.

None of this verifies input *values* — a wrong `build-command` or `artifact-path` passes every check
here. Before tagging, smoke-test against a real consumer repository by temporarily pointing its
caller at your branch.

## Pull request checklist

- [ ] Branch is `<version>/task/<kebab-slug>`, based on the active release branch.
- [ ] The three commands above pass locally.
- [ ] Every new or changed input has a `description:`.
- [ ] `examples/<workflow>.yml` added or updated to match.
- [ ] `CHANGELOG.md` entry added under the current version heading.
- [ ] Breaking changes to an input surface are called out in the PR description.
- [ ] Smoke-tested against a consumer repo, or explicitly noted why not.
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
