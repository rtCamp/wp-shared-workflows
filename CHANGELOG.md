# Changelog

All notable changes to `@rtcamp/wp-shared-workflows` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `ci-test-php.yml` — reusable PHPUnit workflow with a `use-wp-env` toggle (default `true`) for WordPress integration tests via `@wordpress/env`, or standalone PHPUnit for Composer-only packages and libraries. Inputs: `php-version`, `node-version`, `use-wp-env`, `test-command`, `composer-flags`, `working-dir`.