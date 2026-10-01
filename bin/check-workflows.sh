#!/usr/bin/env bash
#
# Validates this repo's own contract:
#   1. Every reusable workflow has exactly one caller example, and vice versa.
#   2. Every `uses:` in an example resolves to a workflow in this repo, pinned at @v1.
#   3. Every `with:` / `secrets:` key an example passes is actually declared by that
#      workflow, and every required input/secret is supplied.
#   4. Repo conventions: kebab-case input names, every input documented, every step named,
#      no caller value interpolated into a `run:` body, reusable workflows take their runner
#      from the runs-on input, and this repo's own CI runs on an allowed label.
#
# Requires: yq (v4) and jq. Locally, `brew install yq jq`.
# Run from anywhere: bin/check-workflows.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WORKFLOW_DIR=".github/workflows"
EXAMPLE_DIR="examples"
SELF_CHECK="ci-self-check.yml"
EXPECTED_REF="v1"
USES_PREFIX="rtCamp/wp-shared-workflows/.github/workflows"
# Reusable workflows run in the caller's repo, so the caller picks the runner.
RUNS_ON_EXPR='${{ fromJSON(inputs.runs-on) }}'
RUNS_ON_FORWARD='${{ inputs.runs-on }}'
# This repo is public, so its own CI runs on GitHub-hosted runners.
OWN_CI_RUNNER_LABELS=(ubuntu-latest)

fail=0

err() {
  echo "::error::$*"
  fail=1
}

for tool in yq jq; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "$tool is required but not installed — brew install yq jq" >&2
    exit 127
  }
done

as_json() { yq -o=json '.' "$1"; }

# --- 1. one example per workflow, one workflow per example -------------------

for wf in "$WORKFLOW_DIR"/*.yml; do
  base="$(basename "$wf")"
  [ "$base" = "$SELF_CHECK" ] && continue
  [ -f "$EXAMPLE_DIR/$base" ] ||
    err "$wf has no caller example — create $EXAMPLE_DIR/$base"
done

for ex in "$EXAMPLE_DIR"/*.yml; do
  base="$(basename "$ex")"
  [ -f "$WORKFLOW_DIR/$base" ] ||
    err "$ex has no matching workflow at $WORKFLOW_DIR/$base — rename or remove it"
done

# --- 2 + 3. every example call matches the workflow it calls -----------------

for ex in "$EXAMPLE_DIR"/*.yml; do
  ex_json="$(as_json "$ex")"

  while IFS= read -r job; do
    [ -n "$job" ] || continue
    uses="$(jq -r --arg j "$job" '.jobs[$j].uses' <<<"$ex_json")"

    case "$uses" in
      "$USES_PREFIX"/*) ;;
      *)
        err "$ex job '$job' calls '$uses'; examples must call $USES_PREFIX/<name>.yml@$EXPECTED_REF"
        continue
        ;;
    esac

    rest="${uses#"$USES_PREFIX"/}"
    wf_name="${rest%@*}"
    ref="${rest##*@}"

    [ "$ref" = "$EXPECTED_REF" ] ||
      err "$ex job '$job' pins @$ref; examples must pin @$EXPECTED_REF so a consumer can paste them as-is"

    if [ ! -f "$WORKFLOW_DIR/$wf_name" ]; then
      err "$ex job '$job' calls '$wf_name', which does not exist in $WORKFLOW_DIR"
      continue
    fi

    wf_json="$(as_json "$WORKFLOW_DIR/$wf_name")"

    declared_inputs="$(jq -r '(.["on"].workflow_call.inputs // {}) | keys[]' <<<"$wf_json")"
    required_inputs="$(jq -r '(.["on"].workflow_call.inputs // {}) | to_entries[]
      | select(.value.required == true) | .key' <<<"$wf_json")"
    declared_secrets="$(jq -r '(.["on"].workflow_call.secrets // {}) | keys[]' <<<"$wf_json")"
    required_secrets="$(jq -r '(.["on"].workflow_call.secrets // {}) | to_entries[]
      | select(.value.required == true) | .key' <<<"$wf_json")"

    given_inputs="$(jq -r --arg j "$job" '(.jobs[$j].with // {})
      | if type == "object" then keys[] else empty end' <<<"$ex_json")"
    given_secrets="$(jq -r --arg j "$job" '(.jobs[$j].secrets // {})
      | if type == "object" then keys[] else empty end' <<<"$ex_json")"

    while IFS= read -r key; do
      [ -n "$key" ] || continue
      grep -qxF "$key" <<<"$declared_inputs" ||
        err "$ex job '$job' passes input '$key', which $wf_name does not declare"
    done <<<"$given_inputs"

    while IFS= read -r key; do
      [ -n "$key" ] || continue
      grep -qxF "$key" <<<"$declared_secrets" ||
        err "$ex job '$job' passes secret '$key', which $wf_name does not declare"
    done <<<"$given_secrets"

    while IFS= read -r key; do
      [ -n "$key" ] || continue
      grep -qxF "$key" <<<"$given_inputs" ||
        err "$ex job '$job' omits required input '$key' of $wf_name"
    done <<<"$required_inputs"

    while IFS= read -r key; do
      [ -n "$key" ] || continue
      grep -qxF "$key" <<<"$given_secrets" ||
        err "$ex job '$job' omits required secret '$key' of $wf_name"
    done <<<"$required_secrets"

  done < <(jq -r '(.jobs // {}) | to_entries[] | select(.value.uses != null) | .key' <<<"$ex_json")
done

# --- 4. repo conventions -----------------------------------------------------

for wf in "$WORKFLOW_DIR"/*.yml; do
  base="$(basename "$wf")"
  wf_json="$(as_json "$wf")"

  while IFS= read -r key; do
    [ -n "$key" ] || continue
    [[ "$key" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] ||
      err "$base input '$key' is not kebab-case"
  done < <(jq -r '(.["on"].workflow_call.inputs // {}) | keys[]' <<<"$wf_json")

  while IFS= read -r key; do
    [ -n "$key" ] || continue
    err "$base input '$key' has no description"
  done < <(jq -r '(.["on"].workflow_call.inputs // {}) | to_entries[]
    | select((.value.description // "") == "") | .key' <<<"$wf_json")

  while IFS= read -r loc; do
    [ -n "$loc" ] || continue
    err "$base has an unnamed step at $loc"
  done < <(jq -r '(.jobs // {}) | to_entries[] as $j
    | ($j.value.steps // []) | to_entries[]
    | select((.value.name // "") == "")
    | "job \($j.key) step #\(.key)"' <<<"$wf_json")

  # A caller value spliced into a run: body at render time can break the script around it — a
  # newline injects extra shell lines, a quote corrupts the next command. Inspects .run only, so
  # env:, with: and if: expressions stay legal. See "Code quality" in AGENTS.md.
  while IFS= read -r loc; do
    [ -n "$loc" ] || continue
    err "$base interpolates a caller value into a run: body at $loc — pass it via step env:"
  done < <(jq -r '(.jobs // {}) | to_entries[] as $j
    | ($j.value.steps // []) | to_entries[]
    | select((.value.run // "") | test("\\$\\{\\{\\s*(inputs|matrix)\\."))
    | "job \($j.key) step #\(.key) (\(.value.name // "unnamed"))"' <<<"$wf_json")

  # A public caller cannot use rtCamp's self-hosted runners, and rtCamp's private repos must
  # (org policy), so no reusable workflow hard-codes a label: every job runs on the runs-on
  # input, and the orchestrators forward it to every leaf.
  if jq -e '.["on"] | type == "object" and has("workflow_call")' >/dev/null <<<"$wf_json"; then
    jq -e '.["on"].workflow_call.inputs["runs-on"] != null' >/dev/null <<<"$wf_json" ||
      err "$base declares no runs-on input"
    while IFS= read -r loc; do
      [ -n "$loc" ] || continue
      err "$base $loc — use runs-on: $RUNS_ON_EXPR"
    done < <(jq -r --arg expr "$RUNS_ON_EXPR" '(.jobs // {}) | to_entries[]
      | select(.value["runs-on"] != null and .value["runs-on"] != $expr)
      | "job \(.key) runs on \(.value["runs-on"] | tostring)"' <<<"$wf_json")
    while IFS= read -r loc; do
      [ -n "$loc" ] || continue
      err "$base $loc — pass runs-on: $RUNS_ON_FORWARD"
    done < <(jq -r --arg fwd "$RUNS_ON_FORWARD" '(.jobs // {}) | to_entries[]
      | select((.value.uses // "") | startswith("./.github/workflows/"))
      | select((.value.with // {})["runs-on"] != $fwd)
      | "job \(.key) does not forward runs-on to \(.value.uses)"' <<<"$wf_json")
  else
    while IFS= read -r loc; do
      [ -n "$loc" ] || continue
      err "$base $loc — allowed: ${OWN_CI_RUNNER_LABELS[*]}"
    done < <(jq -r --args '$ARGS.positional as $allowed | (.jobs // {}) | to_entries[]
      | select(.value["runs-on"] != null)
      | (.value["runs-on"] | if type == "object" then (.labels // []) else . end | [.] | flatten
          | map(tostring) | map(select(. as $l | $allowed | index($l) | not))) as $bad
      | select($bad | length > 0)
      | "job \(.key) runs on disallowed label(s) \($bad | join(", "))"' \
      "${OWN_CI_RUNNER_LABELS[@]}" <<<"$wf_json")
  fi
done

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Workflow/example contract check FAILED." >&2
  exit 1
fi

echo "Workflow/example contract check passed."
