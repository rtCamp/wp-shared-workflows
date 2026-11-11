# Security policy

## Supported versions

| Version | Supported |
|---|---|
| v1 (`@v1`, and the `v1.x` and `v1.x.y` tags) | Yes |
| Branches, untagged commits and other refs | No; pin `@v1` |

Fixes ship as a new v1 release. A caller pinned at `@v1` picks a fix up on
its next run; a caller pinned at an exact `@v1.x.y` tag must move to the new
tag.

## Reporting a vulnerability

Please do not report security issues in public issues, pull requests or
discussions.

Report them privately through GitHub instead: open the repository's
**Security** tab and choose **Report a vulnerability**, or go straight to
<https://github.com/rtCamp/wp-shared-workflows/security/advisories/new>. The
report stays visible only to you and the maintainers, and the fix, the release
and the advisory are coordinated in that same thread.

Include what you can of:

- the affected workflow file and the ref you call it at (for example `@v1`);
- the impact, and the conditions an attacker needs;
- steps or a minimal proof of concept that reproduce it.
