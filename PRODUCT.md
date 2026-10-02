# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A private group of two to six friends playing Texas Hold'em on desktop or
phones. Confirmed product scope and architecture are maintained in `plan.md`.

## Product Purpose

Play consecutive hands, earn persistent tickets, pull cosmetic avatars and card
backs, equip them, and retain progress after signing out. Cosmetics never
change poker strength. Chips are temporary session currency, separate from tickets.

## Capabilities and Constraints

Invite-only verified email/password accounts; backend authority for all game
and economy actions. No purchases, trading or public matchmaking. M3 tickets
is merged. M4 collection rules and the original celestial vector catalogue
were approved on 2026-10-01; implementation evidence belongs in `CHECKPOINT.md`.
Pulls cost 5/50 tickets, base rarity odds are 70/25/5%, with SR+ at 10 and SSR
at 90. Duplicates give no refund; unowned SSRs are selected first.

## Brand Commitments

Preserve the approved blue-and-white anime/celestial/Wonderland direction in
`DESIGN.md`. Looking Glass Club is the existing working name. Room invitations
and cosmetic invitations must remain distinguishable in labels.

## Evidence on Hand

Approved visual reference: `docs/design/approved-theme-v4.png`.
Original M4 artwork: `apps/web/public/art/cosmetics/manifest.json` and editable
generator `scripts/generate-celestial-art.mjs`. The historical hostess image
has provisional provenance and is not proof of production licensing.

## Product Principles

- Server-committed results and account ownership govern the interface.
- Retrying an uncertain purchase preserves its original identity.
- Private cards remain private regardless of the equipped artwork.
- Equipment changes apply at the next hand boundary.

## Accessibility & Inclusion

Keyboard access, visible focus, reduced motion, explicit rarity/ownership
labels and playable 360px layouts follow the approved design requirements.
