# Changelog

All notable changes to `@rtcamp/wp-shared-workflows` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `ci-test-a11y.yml` — reusable pa11y-ci accessibility test workflow. Order: `npm ci` → build → `wp-env start` → pa11y → `wp-env stop` (with `if: always()` so cleanup runs on failure). Inputs: `node-version`, `build-command`, `test-command`, `working-dir`. Trigger-agnostic — consumers wire the `Run a11y` label gate at the caller level.