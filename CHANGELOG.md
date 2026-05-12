# Changelog

All notable changes to `@rtcamp/wp-shared-workflows` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `ci-test-js.yml` — reusable Jest unit-test workflow with optional cross-run cache (`enable-cache`), monorepo support (`working-dir`), and a consumer-overridable command (`test-command`). Replaces the copy-pasted `unit-tests-js` job from the legacy `Test and Measure` workflow.
