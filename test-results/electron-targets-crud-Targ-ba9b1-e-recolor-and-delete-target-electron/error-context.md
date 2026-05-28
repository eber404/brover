# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: electron/targets-crud.spec.ts >> Targets CRUD Flow >> create, rename, recolor and delete target
- Location: tests/electron/targets-crud.spec.ts:32:7

# Error details

```
Error: page.evaluate: Error: No space available
    at eval (eval at evaluate (:302:30), <anonymous>:9:31)
    at async <anonymous>:328:30
```

# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - heading "Welcome to Brover" [level=1] [ref=e8]
    - paragraph [ref=e9]: Choose how you want to set up your environment secrets
  - generic [ref=e10]:
    - generic [ref=e11] [cursor=pointer]:
      - generic [ref=e12]:
        - heading "Import from dotfiles" [level=2] [ref=e13]
        - paragraph [ref=e14]: Scan existing .zshrc / .bashrc and import sensitive environment variables
      - button "Start import" [ref=e15]
    - generic [ref=e16] [cursor=pointer]:
      - generic [ref=e17]:
        - heading "Fresh start" [level=2] [ref=e18]
        - paragraph [ref=e19]: Set up new secrets from scratch with a clean configuration. Current system secrets reamain untouched.
      - button "Start fresh" [ref=e20]
```