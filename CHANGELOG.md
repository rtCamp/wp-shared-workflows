# Changelog

All notable changes to `@rtcamp/wp-shared-workflows` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `ci-test-php.yml`: reusable PHPUnit workflow with a `use-wp-env` toggle (default `true`) for WordPress integration tests via `@wordpress/env`, or standalone PHPUnit for Composer-only packages and libraries. Inputs: `php-version`, `node-version`, `use-wp-env`, `test-command`, `composer-flags`, `working-dir`. The `test-command` default is empty and selects `npm run test:php` in wp-env mode, `vendor/bin/phpunit` standalone.
- `ci-test-js.yml` — reusable Jest unit-test workflow with optional cross-run cache (`enable-cache`), monorepo support (`working-dir`), and a consumer-overridable command (`test-command`). Replaces the copy-pasted `unit-tests-js` job from the legacy `Test and Measure` workflow.
- `ci-test-a11y.yml` — reusable pa11y-ci accessibility test workflow. Order: `npm ci` → build → `wp-env start` → pa11y → `wp-env stop` (with `if: always()` so cleanup runs on failure). Inputs: `node-version`, `build-command`, `test-command`, `working-dir`. Trigger-agnostic — consumers wire the `Run a11y` label gate at the caller level.