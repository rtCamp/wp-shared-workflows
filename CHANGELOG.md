# Changelog

All notable changes to `@rtcamp/wp-shared-workflows` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `ci-build.yml`: reusable production-build workflow that covers the three rtCamp project shapes (Node-only, Composer-only, both). Each stack is gated on its own toggle: `install-node-deps` (default `true`) and `install-composer-deps` (default `false`). Default `composer-flags` use `--no-dev` (production build) and keep `--no-scripts` for supply-chain hygiene. The `build-command` default is empty and selects `npm run build:prod` when Node deps install, `composer run-script build` otherwise. Optional `upload-artifact` (default `false`) hands the build output to a downstream CD job; uses `if-no-files-found: error` so a misconfigured artifact path fails loudly at the upload step. Inputs: `install-node-deps`, `node-version`, `install-composer-deps`, `php-version`, `composer-flags`, `build-command`, `upload-artifact`, `artifact-name`, `artifact-path`, `retention-days`, `working-dir`.
