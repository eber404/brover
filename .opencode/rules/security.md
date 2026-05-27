# Security Rules

## Must protect

- Secrets at rest in Keychain.
- Auth-gated sensitive operations.

## Auth gate policy

- Reveal: always authenticate.
- Update: always authenticate.
- Delete: always authenticate.
- Copy: authenticate only when value is hidden.

## Logging policy

- Allowed: names, ids, operation status, timestamps, non-sensitive errors.
- Forbidden: raw secret values, shell export lines with values, keychain payload dumps.
