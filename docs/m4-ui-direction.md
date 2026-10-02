# M4 UI direction

Mode: Operate. Extend the approved `DESIGN.md` collection/invitation surfaces.
The user confirmed the rules and original celestial artwork on 2026-10-01.
Friends browse the catalogue, spend earned tickets and equip owned items
between hands on desktop or phone. Preserve the incumbent system.

THESIS: a transparent cosmetic invitation, with the durable purchase result
visible and recoverable before another purchase is offered.
OWN-WORLD: existing pale-blue/white club shell, cobalt controls, navy text,
fine gold accents, system UI type and readable rarity labels.
STORY: review prices/rates/duplicate rules, open, reveal a committed result,
then select an owned avatar or card back for the next hand.
FIRST VIEWPORT: heading and wallet, single/ten controls with compact rules,
then the original catalogue; collection uses slot tabs, current defaults,
owned-first previews and an inline equipment preview.
FORM: inherited precise invitation/collection composition from DESIGN.md;
seed key `M4-INHERITED-DESIGN`, no new visual-world selection.
FINISH: the finish review is closed and the built M4 system is recorded below;
the approved root design specification remains the inherited visual authority.

Keep empty, loading, insufficient-ticket, storage-unavailable, uncertain request,
session expiry and revision-conflict states actionable. Reduced motion and skip
show identical committed results. No fabricated tickets, chances or ownership.

## Built surface record — 2026-10-01

This is an extension of the approved identity. The record below describes
`apps/web/src/features/gacha`, `apps/web/src/features/collection`, the shared
shell and `apps/web/src/app/globals.css`; it does not replace `design.md`.

### Live visual vocabulary

The shared source is `apps/web/src/styles/tokens.css`. M4 uses its existing
tokens directly rather than introducing another palette.

| Token | Live value | M4 role |
|---|---|---|
| `--canvas` / `--surface` / `--surface-soft` | `#f7fbff` / `#ffffff` / `#eaf4ff` | Page, paper, selection and notices |
| `--brand` / `--brand-hover` | `#1765d1` / `#104fa9` | Primary controls and their hover state |
| `--ink` / `--muted` | `#102a56` / `#526480` | Headings and supporting text |
| `--line` / `--accent` | `#cbdcef` / `#b99452` | Dividers, envelope folds and fine celestial accents |
| `--danger` / `--focus` | `#b42336` / `#0b6de8` | Shared error and keyboard-focus vocabulary |
| `--radius-sm` / `--radius-md` | `7px` / `10px` | Inherited control and panel shapes |
| `--shadow-dialog` | `0 18px 70px rgb(16 42 86 / 15%)` | Shared authentication overlay; M4 content remains flat |

Body type is `"Segoe UI", system-ui, sans-serif`; the inherited wordmark uses
Georgia. Page headings are 30px/650 (26px on phones); section headings are
23px with 1.25 line height; item names are 16px; supporting M4 copy is 14px
with 1.6 line height. Artwork and selectable tiles use 12px corners, notices
8px, and rarity labels 4px. R text/background are `#154679`/`#eaf4ff`, SR
`#563081`/`#f0e8fa`, and SSR `#755013`/`#faf0d8`; rarity always appears as text.

### Task structure and responsive behavior

The shell caps at 1600px, with a 188px desktop navigation rail; M4 content
caps at 1120px. Invitations presents heading, server wallet, single/ten
controls, native Rates & guarantees disclosure and duplicate policy before
the twelve-item catalogue. Prices, weights and guarantees come from banner
data. Collection presents its invitation shortcut, slot tabs, next-hand
explanation, default/owned-first inventory and equipment preview.

| Width | Invitations/results | Collection |
|---|---|---|
| Above 1100px | Four-column grid; purchase/result actions use intrinsic widths with 190px minimum | Three-column inventory beside a sticky 260px preview; 32px gap |
| 768–1100px | Three-column grid; 88px shell rail | Two-column inventory beside a 210px preview; 20px gap |
| At most 767px | Two-column grid; full-width actions at least 48px high | Compact preview above two-column inventory; 88px artwork and full-width equip control |

Phones use 20px main gutters, 98px bottom padding and three equal bottom
navigation items with safe-area padding. Selecting an item on a phone
instantly scrolls the preview into view and focuses it without further
scrolling, keeping the equip action reachable after browsing long grids.

### Controls, state and authored assets

Navigation links use `aria-current="page"`: cobalt text, pale-blue fill and
a 3px inset left marker on desktop or bottom marker on phones. Inactive links
remain muted; hover uses cobalt on the canvas. Selected slot tabs have a
cobalt underline and `aria-selected`; item buttons expose `aria-pressed`
with cobalt border and pale-blue fill. Selection and server-confirmed
equipment remain distinct, with explicit Owned, Not owned and Equipped copy.
Primary controls use cobalt/white; secondary controls use white/cobalt and
a `#7799c3` border. Disabled M4 buttons use .55 opacity and a not-allowed
cursor. Shared buttons/links have a 3px focus outline with 4px offset.

The six avatars and six card backs are original repository-authored SVGs,
recorded in `apps/web/public/art/cosmetics/manifest.json` and reproducible
through `scripts/generate-celestial-art.mjs`. Their paired celestial geometry
and restrained portrait treatment extend the existing artwork vocabulary.
Catalogue/inventory artwork is lazy-loaded. Free user/club vector defaults
remain available without a pull.

`PullReveal` authors a blue-lined paper envelope, rabbit seal, fine dotted
gold ring and small star directly in SVG. After a committed receipt arrives,
the envelope enters over .8s with `cubic-bezier(.16, 1, .3, 1)` and the seal
scales/fades over .8s ease-out; results appear at 900ms. Skip reveal shows
the same saved results immediately. Ten pulls share one reveal and a compact
result grid, with item name, type, rarity and New or Duplicate · no refund,
then Continue and View in Collection.

### Interaction invariants

- Slot tabs use roving focus with Left/Right/Home/End keys and linked tab
  panels. Item, disclosure, reveal and equipment controls use native keyboard
  semantics. The reveal heading receives focus at entry and result display.
- Reduced motion shows the committed results immediately and suppresses
  transitions/animations; skipping or changing motion never changes rewards.
- A pull identity is saved and read back in account-scoped session storage
  before submission. Pending requests replace spending controls with recovery;
  recovery looks up the same receipt and only resubmits that identity if absent.
  Uncertain errors preserve it; Continue clears it after a committed result.
- Storage failure blocks another purchase and explains enable-storage/reload.
  Missing wallet/catalogue data shows loading or retry feedback rather than a
  fabricated balance. Insufficient tickets points to qualifying poker hands.
  Error alerts and recovery status remain inline; expiry uses shared session
  recovery. Definitive failures clear the pending identity; stale banner data
  is refreshed before a new purchase.
- Equip is disabled while saving/refetching, for unowned selections, or for
  already-equipped items. Revision-checked server responses govern equipment;
  failure keeps confirmed equipment, refreshes account data and reports the
  error. Success explains the next-hand boundary. Cosmetics remain appearance
  only and do not change the current hand or private-card visibility.

### Finish evidence and limits

The fresh finish review's final disposition is **ship**. Its six findings are
resolved: `navstate`, `undefinedtokens`, `desktopwidths`, `mobilepreview`
reachability, `authoredreveal`, and obsolete documentation status. The root
specification's status/closing references were corrected without replacing
the approved identity.

Final desktop/mobile captures are `m4-pulls-{desktop,mobile}.png`,
`m4-collection-{desktop,mobile}.png` and `m4-reveal-{desktop,mobile}.png` in
`C:/Users/Neary/.codex/visualizations/2026/09/30/01a0f22a-56b5-7962-a8ba-8d81e913a656/m4-review/`.
The implementation session reports Chromium 14/14 and captured M4 flow 1/1,
server 169, web 68, contracts 15 and engine 18 tests passing, plus final
typecheck and production builds. These are local/isolated verification
results; no live database, deployment or hosted acceptance is claimed.
`plan.md` and `CHECKPOINT.md` retain the current task and release gates.
