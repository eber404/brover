# Homebrew Main Repository Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the public `eber404/brover` repository the Homebrew cask source and remove the legacy tap.

**Architecture:** Keep the cask and release assets together in the main repository. The release workflow creates or updates the repository release, calculates checksums from its uploaded assets, then commits the cask update on `main`.

**Tech Stack:** GitHub Actions, GitHub Releases, Homebrew Cask, Markdown.

---

### Task 1: Move the current cask into the main repository

**Files:**
- Create: `Casks/brover.rb`

**Step 1: Write the cask for the current public release**

Use version `0.1.6`, its published arm64 and x64 SHA-256 values, and URLs under `eber404/brover/releases`.

**Step 2: Verify the cask**

Run: `brew audit --cask --strict Casks/brover.rb`

Expected: exit code 0.

### Task 2: Keep future releases and the cask in one repository

**Files:**
- Modify: `.github/workflows/release.yml:3-150`

**Step 1: Remove the cross-repository configuration and token use**

Publish the release in the current repository with `GITHUB_TOKEN` rather than `BROVER_RELEASES_TOKEN`.

**Step 2: Replace the external clone with a checkout of the current repository**

Use the published release asset digests to regenerate `Casks/brover.rb`, commit it, and push `main`.

**Step 3: Validate workflow syntax and forbidden references**

Run: `rg 'homebrew-brover|BROVER_RELEASES_TOKEN' .github/workflows/release.yml`

Expected: no matches.

### Task 3: Document the public install command

**Files:**
- Modify: `README.md:34-47`
- Modify: `AGENTS.md:129-136`

**Step 1: Document the cask-qualified command**

Use `brew tap eber404/brover https://github.com/eber404/brover && brew install --cask brover`.

**Step 2: Describe the single-repository distribution flow**

Remove references to the deleted tap and its secret.

### Task 4: Verify and publish the migration

**Files:**
- Verify: `Casks/brover.rb`
- Verify: `.github/workflows/release.yml`
- Verify: `README.md`
- Verify: `AGENTS.md`

**Step 1: Run type checking and unit tests**

Run: `bun run tsc`

Run: `bun run test`

Expected: both exit code 0.

**Step 2: Commit and push the migration branch to `main`**

Use a concise `chore:` commit message and push only the migration files.

**Step 3: Delete the legacy repository**

Run: `gh repo delete eber404/homebrew-brover --yes`

Expected: the repository URL returns not found.
