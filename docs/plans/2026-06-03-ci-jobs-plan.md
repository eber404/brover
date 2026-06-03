# CI Jobs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split CI into sequential jobs for typecheck, unit tests, and e2e tests.

**Architecture:** Keep one GitHub Actions workflow. Define three jobs with `needs` so each downstream job runs only after prior job passes. Repeat Node setup per job for isolation and clear status reporting.

**Tech Stack:** GitHub Actions, Node 20, npm, TypeScript, Vitest, Playwright, Electron

---

### Task 1: Reshape workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1:** Replace single `test` job with `typecheck`, `unit-tests`, `e2e-tests`.

**Step 2:** Add `needs` chain: `unit-tests` needs `typecheck`; `e2e-tests` needs `unit-tests`.

**Step 3:** Keep shared setup in each job: checkout, Node 20, npm cache, `npm ci`.

**Step 4:** Run commands:
- `npm run tsc`
- `npm run test`
- `xvfb-run --auto-servernum npm run test:e2e`

**Step 5:** Add Playwright install step in e2e job: `npx playwright install --with-deps chromium`.

### Task 2: Verify locally

**Files:**
- Verify: `.github/workflows/ci.yml`

**Step 1:** Run `npm run tsc`.

**Step 2:** Run `npm run test`.

**Step 3:** Run `npm run test:e2e` if local env supports Electron UI launch.

**Step 4:** Read workflow file to confirm `needs` order.
