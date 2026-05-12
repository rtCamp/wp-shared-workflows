# Changelog

All notable changes to `@rtcamp/wp-shared-workflows` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `ci-build.yml` — reusable production-build workflow with an optional `upload-artifact` step (default `false`) so consumers can either verify the build exits 0 (CI-only) or hand the built files to a downstream CD job. Inputs: `node-version`, `build-command`, `upload-artifact`, `artifact-name`, `artifact-path`, `retention-days`, `working-dir`. Uses `if-no-files-found: error` so a misconfigured artifact path fails loudly at the upload step.
