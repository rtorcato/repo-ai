# Contributing

`main` is protected: every change lands through a squash-merged PR, and the `ci` CI job is the
required check.

1. **Open or pick an issue**, then branch per issue from `main`:
   `<type>/<issue-N>-<short-name>`, e.g. `fix/12-reap-timeout`. One issue per branch and PR.
2. **Commit with [Conventional Commits](https://www.conventionalcommits.org/)** (enforced by commitlint).
3. **Run `pnpm verify` before pushing** — Biome check, typecheck, tests and build.
4. **Add a changeset** for any user-facing change: `pnpm changeset`. Pick the bump
   (patch/minor/major) and commit the file under `.changeset/` with your PR. Don't edit
   `version` in `package.json` by hand.
5. **Give the PR a Conventional Commit title.** It becomes the squash commit on `main`. Put
   `Closes #N` in the body.

Merging does not release. Each push to `main` opens or updates a "Version Packages" PR that
consumes the pending changesets. Merging that PR is the release: its `publish` job waits for one
approval on the `release` environment, then publishes to npm and creates the GitHub Release.

Every command supports `--json`; in JSON mode diagnostics go to stderr, never stdout.

Security issues: see [SECURITY.md](SECURITY.md), not the public tracker.
