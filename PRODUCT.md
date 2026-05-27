# Product

## Register

product

## Users

Developers and DevOps engineers managing local environment variables and secrets across multiple deployment spaces (dev/qa/prod/custom). They work at a desk, typically on a secondary monitor, in a focused coding context. The app is opened frequently throughout the day for quick secret lookups and value applying.

## Product Purpose

A secure, local-first secret manager with macOS Keychain backend. Guards reveal/copy/update/delete behind biometric or password authentication. Organizes secrets by spaces and targets, with a tied-targets workflow for syncing env names across environments. Applies active target values to shell dotfiles or directory `.env.<target>` files.

## Brand Personality

Technical confidence without ceremony. The tool feels like it was made by a senior engineer for their own use: precise, fast, no decorative cruft. Calm authority — the kind of tool that doesn't need to prove its worth with animations or gradients.

## Anti-references

- No "enterprise Security Theater" — no gold镶嵌, no shield imagery, no "military-grade" copy
- No Linear clone aesthetics (darkSidebar + gradientAccent)
- No generic SaaS dashboard look — white cards on gray bg with a single blue accent
- No gradient text or glassmorphism
- No neon on black crypto vibes

## Design Principles

1. **Trust through transparency** — non-sensitive metadata is visible without auth; secrets get behind a gate, but the gate is not show-offy
2. **Snappy no-ceremony interaction** — values apply instantly, dialogs dismiss cleanly, nothing blocks flow
3. **Focused density** — three-column layout fits maximum context on screen; no empty states that waste space
4. **Ambient security** — Mac Keychain integration feels native, not bolted-on; auth prompts are brief and purposeful
5. **Destructive actions have weight** — deletion and overwrite require confirmation, but confirmation UI is fast, not theatrical

## Accessibility & Inclusion

- WCAG AA compliance
- Keyboard navigable throughout
- Reduced motion support for any animation used
- High contrast between text and backgrounds (no low-chroma against low-chroma)
