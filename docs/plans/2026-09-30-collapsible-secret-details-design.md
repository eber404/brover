# Collapsible Secret Details Design

## Goal

Remove the persistent details column and use the available workspace for the secret list until a user requests details.

## Layout

The layout contains the terminal rail, environments sidebar, and a full-width secret list. The search bar spans the full secret workspace.

Selecting a secret card opens a centered modal. The modal uses the existing dialog overlay, maximum width of 560px, and responsive horizontal margins.

The modal header includes a close button. Clicking the overlay or pressing Escape also closes it. Closing the modal clears the selected secret and restores the full-width secret list.

Changing environments also clears the selected secret and closes the details panel.

## Secret Card Actions

Each secret card contains a copy button at its right edge. This control copies the secret value after the existing authenticated copy flow. It must not select the card or open the modal.

The card body selects the secret and opens the modal. Selecting another card updates the modal content.

The copy control has an accessible label and tooltip.

## State and Safety

The existing selected secret identifier remains the source of truth. An empty identifier means the details panel is closed.

Copy, reveal, update, and delete retain current authentication requirements. No secret value is stored in renderer state beyond the existing temporary revealed value.

## Verification

Add coverage for the closed initial layout, opening details through a card, copying without opening details, closing with the header control, and clearing details after an environment change.
