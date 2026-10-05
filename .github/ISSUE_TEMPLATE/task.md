---
name: Task
about: A self-contained unit of work for this milestone
title: '[<scope>] <short action title>'
labels: 'Type: Task'
---

<!--
Fill every section below. Leave placeholders in square brackets where you want a developer to fill in.
Keep the section order — developers, reviewers, and testers all read top-to-bottom.
-->

**Repo:** `rtCamp/<repo>`
**Milestone:** `<milestone>`
**Sprint:** Sprint <N> · Week <X>
**Effort:** <XS | S | M | L | XL>
**Priority:** <P0 | P1 | P2>
**Labels:** `Type: Task` · `Scope: <scope>` · `Priority: <priority>`

---

## Why we need this

<!-- 2-3 sentences. Plain language. What does this unlock? What breaks if it slips? -->

---

## Before you start

### You can start once these are closed

- [ ] #<N> — <title>
<!-- or: "Nothing. You can pick this up right away." -->

### You'll need

- Write access to `rtCamp/<repo>`
- <tool> <version> (`<check-command>`)

### Worth reading first

- `CLAUDE.md` → section "<name>"
- <any-other-doc-path>

---

## What you're building

### In scope

-

### Out of scope

-

---

## How to build it

### File layout

```
<tree>
```

### Implementation

<!-- Code blocks, class signatures, config snippets. Exact, not pseudo-code. -->

### Conventions to follow

-

### Things to avoid

-

---

## How to verify your work

Run these locally before opening the PR. All must exit 0:

```bash
$ ...
```

### Quick smoke test

```bash
$ ...
```

---

## Acceptance criteria

### Runtime behavior
- [ ]

### Code quality
- [ ]

### Housekeeping
- [ ] `examples/<workflow>.yml` added or updated to match

---

## Reviewer checklist

- [ ]

---

## Submitting your work

| | |
|---|---|
| **Base your branch on** | `main` |
| **Branch name** | `<type>/<slug>`, e.g. `fix/runs-on-input` |
| **PR target** | `main` |
| **PR title** | A [Conventional Commit](https://www.conventionalcommits.org/) `<type>(<scope>): <short changelog entry>` |

```bash
git fetch origin
git checkout main
git pull
git checkout -b <type>/<slug>
# work, commit
git push -u origin <type>/<slug>
```

PR description starts with `Closes #<this-issue>` so the Project card auto-moves to Done on merge.

---

## What this unblocks

- #<N> — <title>
