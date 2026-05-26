# Add Secret Modal Design

## Context

Reference image: `ref/add-secret-modal.png`

Goal: refactor current `Add Secret` modal so it matches the visual structure of the reference while staying aligned with current brover scope.

Important scope constraint:

- do **not** include `Environment` selector;
- do **not** reintroduce `profiles` through this modal.

---

## Recommended Approach

Use the reference modal structure almost exactly, but adapt the content to current brover behavior.

Keep:

- title/subtitle hierarchy;
- large glass panel shell;
- field spacing and rounded inputs;
- bottom info card;
- right-aligned `Cancel` and `Save Secret` actions.

Remove:

- `Environment` segmented control block.

Reason: best visual fidelity without reopening a removed product concept.

---

## Modal Structure

### Header

- title: `Add Secret`
- subtitle: `Create a new secret stored securely in macOS Keychain`
- divider line below header

### Fields

Order:

1. `Secret Name`
2. helper text for valid env names
3. `Secret Value`
4. `Description` (optional text area)
5. info card about Keychain/JSON storage

### Footer actions

- `Cancel`
- `Save Secret`

Alignment: right side, matching reference.

---

## Visual Language

### Shell

- centered floating panel;
- dark liquid-glass surface;
- thin border;
- subtle blur and shadow;
- generous inner padding.

### Labels

- section labels small/quiet;
- consistent spacing between label and field;
- helper text softer than body text.

### Inputs

- larger vertical rhythm than current form;
- rounded corners;
- thin border with active orange focus state;
- visual consistency with existing secrets shell.

### Secret Value field

- single-line input;
- eye icon inside trailing side;
- hidden by default.

### Description field

- text area;
- multi-line;
- optional;
- placeholder text only when empty.

### Info card

- icon at left (`shield` or `lock`);
- short message: `Stored in Keychain. Secret values are never saved in local JSON.`

### Buttons

- `Cancel`: neutral/dim glass button;
- `Save Secret`: orange primary button.

---

## Interaction Rules

### Secret Name

- normalize as user types:
  - uppercase;
  - spaces -> underscores;
  - remove hyphens.
- helper text remains visible at all times.

### Secret Value

- required;
- eye button only controls visibility.

### Description

- optional;
- no fallback text like `No description` should be introduced.

### Save button

- disabled until `Secret Name` and `Secret Value` both contain content.

### Keyboard behavior

- `Escape` closes modal;
- `Enter` only submits when valid and appropriate.

---

## Data Flow

1. user opens modal from `Add Secret`
2. user fills fields
3. `Save Secret` runs current `createEnv()` flow
4. on success:
   - modal closes
   - inputs reset
   - center list refreshes
   - new item can become selected
5. on failure:
   - modal stays open
   - message appears inline or as modal-local feedback

---

## Error Handling

- invalid name: clear inline validation message
- missing required fields: prevent submit
- Keychain/auth failure: generic message only
- never render secret contents in error UI

---

## Testing Requirements

### Unit

- `Save Secret` disabled when required fields empty
- env-name normalization preserved

### UI smoke

- modal renders title, subtitle, divider
- `Environment` block absent
- `Description` is text area
- `Cancel` and `Save Secret` buttons present

### Integration

- successful modal submit writes secret to Keychain
- metadata persists without secret value in JSON

---

## Non-goals

- no environment/profile selector
- no account/auth widgets
- no extra metadata fields beyond current MVP needs
