# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## Unreleased

### Added

- `version-monitor.yml` — monthly scheduled workflow that detects version bumps and opens a draft PR per repo on a `version-monitor/YYYY-MM` branch. Re-runs in the same month update the existing PR. Node.js version is set via the `node-version` input (default `22`). Major bumps are surfaced for manual review; a month of only major bumps, or a detector that could not be checked, fails the run rather than passing silently.
