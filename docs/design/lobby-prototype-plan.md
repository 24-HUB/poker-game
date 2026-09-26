# Lobby Prototype Implementation Plan

**Goal:** Make the approved lobby design reviewable through local interactions.
**Spec:** ../../design.md; product authority: ../../plan.md.
**Architecture:** Standalone static HTML/CSS/JavaScript prototype under prototype/. No production architecture changes. Local demo state only; no account, economy, or network mutations.
**Execution:** Implement inline in this session, as authorized by the user's request to proceed to the interactive prototype.

## Tasks

- [x] Build responsive lobby, compact supporting artwork, consistent vector icons, and clear navigation.
- [x] Implement create/join forms, input validation, waiting room, copy-link feedback, and a sample-room route. Collection/invitations show honest preview panels rather than pretend backend functionality.
- [x] Verify keyboard/form flows and desktop/mobile layout; record limitations and startup command.

## Review focus

Empty room name, invalid pasted invitation, narrow screen overflow, focus after closing dialogs, and demo links must not imply real multiplayer.

## Constraints

No purchases, persistent-chip wallet, fake online counts, or live poker claims. Prototype sample tickets are labeled. Check usage at milestones and save CHECKPOINT.md before stopping if any remaining allowance is below 6%.

Checkpoint: resumed after usage reset and completed browser review. See lobby-prototype-review.md for checks, fixes, and verification limits, and ../../CHECKPOINT.md for handoff context.
