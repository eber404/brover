# Coverage Badge Branch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish code coverage badge from CI to dedicated branch without external service.

**Architecture:** Unit-test job will generate coverage summary artifact. Final publish job will run only on successful pushes to `main`, build SVG badge from summary via local script, then publish badge file to `badges` branch. README will point to badge file in that branch.

**Tech Stack:** GitHub Actions, Node 20, Vitest, V8 coverage, plain JavaScript SVG generation

---

### Task 1: Add badge generator with TDD

**Files:**
- Create: `scripts/generateCoverageBadge.mjs`
- Create: `scripts/generateCoverageBadge.test.ts`

**Step 1:** Write failing tests for parsing summary percentage, choosing color, rendering SVG.

**Step 2:** Run targeted Vitest command and confirm failure from missing module.

**Step 3:** Implement minimal generator functions and CLI entry.

**Step 4:** Run targeted tests and confirm pass.

### Task 2: Update CI chain

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1:** Change unit job to run `npm run test:coverage`.

**Step 2:** Ensure coverage summary JSON exists and upload as artifact.

**Step 3:** Add `publish-coverage-badge` job after `e2e-tests`.

**Step 4:** Restrict publish job to `push` on `main`.

**Step 5:** Generate badge from artifact and publish folder to `badges` branch.

### Task 3: Wire docs

**Files:**
- Modify: `README.md`
- Modify: `package.json`

**Step 1:** Add coverage badge near CI badge.

**Step 2:** Add local npm script for badge generation if helpful.

### Task 4: Verify end to end

**Files:**
- Verify: `.github/workflows/ci.yml`, `scripts/generateCoverageBadge.js`, `README.md`

**Step 1:** Run targeted badge tests.

**Step 2:** Run `npm run tsc`.

**Step 3:** Run `npm run test`.

**Step 4:** Run `npm run test:e2e`.
