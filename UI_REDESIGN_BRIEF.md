# 🎨 UI Redesign Brief — Anime Style (Genshin Impact × Blue Archive)

> **For:** Gemini (or any AI coding agent)
> **Scope:** All frontend pages and components in `apps/web/src/`
> **Goal:** Transform the current "Texas casino" aesthetic into a soft anime RPG UI style inspired by **Genshin Impact** and **Blue Archive**
> **Constraint:** Do NOT change any logic, props, hooks, or TypeScript types — only change JSX class names, inline styles, and visual structure

---

## 📐 Design System

### Color Palette — Replace ALL Casino Colors

| Token | Old (Casino) | New (Anime) | Usage |
|-------|-------------|-------------|-------|
| Page background | `#0f0c29` deep purple | `#0d1b2e` deep navy | Base bg |
| Panel background | `bg-white/5` | `bg-gradient-to-b from-[#1a2744]/90 to-[#0f1e38]/90` | Cards, modals |
| Primary accent | `#ffd700` gold | `#7ec8e3` sky blue | Primary buttons, active state |
| Secondary accent | — | `#c5a3ff` soft lavender | Hover, secondary elements |
| Highlight/Special | `#ffd700` only | `#ffe082` warm gold | Chips, rank badges, SSR only |
| Danger | `#e74c3c` | `#ff6b8a` soft pink-red | Fold, delete, errors |
| Success | `#2ecc71` | `#7ee8a2` mint green | Open rooms, positive states |
| Table felt | `#1a6b3c` casino green | `#1a3a5c` deep blue | Game table surface |
| Card border | `border-[#ffd700]` | `border-[#7ec8e3]/60` | Community cards |
| Text primary | `text-white` | `text-white` | Keep |
| Text muted | `text-white/40` | `text-[#8bacc8]` | Labels, secondary text |

### Typography — Keep Existing Fonts, Change Usage

```css
/* fonts already loaded in index.css via Google Fonts */
font-cinzel    → page titles, section headers, card names, button labels
font-inter     → body text, descriptions, labels, form inputs
font-jetbrains → chip amounts, numbers, bet values, timers
```

### Shared Panel Style — Use This for All Modals / Cards

```
bg-gradient-to-b from-[#1a2744]/90 to-[#0f1e38]/90
border border-[#7ec8e3]/20
rounded-2xl
backdrop-blur-md
shadow-[0_8px_32px_rgba(0,0,0,0.4)]
```

### Decorative Corner Accent (anime UI ornament)

Use this SVG-like CSS border decoration on important panels:

```jsx
// Top-left and bottom-right corner ornaments as pseudo-divs inside panels
<div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#7ec8e3]/60 rounded-tl-xl" />
<div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#7ec8e3]/60 rounded-br-xl" />
```

### Page Background Pattern

Replace all `bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]` with:

```
bg-[#0d1b2e]
```

Then add an animated star/bokeh layer inside the page root div:

```jsx
{/* Anime bokeh background — always rendered behind content */}
<div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
  <div className="absolute inset-0 bg-[#0d1b2e]" />
  {/* gradient orbs */}
  <div className="absolute top-[-10%] left-[20%] w-96 h-96 rounded-full bg-[#7ec8e3]/5 blur-[80px]" />
  <div className="absolute bottom-[-5%] right-[10%] w-80 h-80 rounded-full bg-[#c5a3ff]/5 blur-[100px]" />
  <div className="absolute top-[40%] left-[-5%] w-64 h-64 rounded-full bg-[#ffe082]/4 blur-[60px]" />
</div>
```

---

## 📄 Page-by-Page Instructions

---

### 1. `apps/web/src/pages/LoginPage.tsx` & `RegisterPage.tsx`

**Current look:** Plain deep-purple gradient, white glass card, gold title.

**Target:** Genshin Impact login screen — deep navy background with soft glowing orbs, anime-style decorative frame around the form, logo with soft blue glow instead of gold.

#### Changes:

1. **Page wrapper** — replace gradient class with:
   ```
   className="min-h-screen bg-[#0d1b2e] flex items-center justify-center px-4 relative overflow-hidden"
   ```

2. **Add bokeh layer** (see Design System above) as the first child inside page wrapper.

3. **Logo/Title** — change text color and glow:
   ```
   // Before
   className="font-cinzel text-4xl font-bold text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]"
   
   // After
   className="font-cinzel text-4xl font-bold text-white drop-shadow-[0_0_30px_rgba(126,200,227,0.6)]"
   ```
   
   Change tagline color:
   ```
   // Before: text-white/50
   // After:  text-[#8bacc8]
   ```

4. **Form card** — replace `bg-white/5 backdrop-blur border border-white/10` with the Shared Panel Style plus corner ornaments:
   ```
   className="relative bg-gradient-to-b from-[#1a2744]/90 to-[#0f1e38]/90 border border-[#7ec8e3]/20 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md"
   ```
   Add corner ornaments inside the card div (4 corners: top-left, top-right, bottom-left, bottom-right using variants of the corner CSS above).

5. **Section title** `"Sign In"` / `"Create Account"`:
   ```
   className="font-cinzel text-xl text-[#7ec8e3] mb-6 text-center tracking-widest"
   ```

6. **Input fields** — replace `border-white/20` focus `border-[#ffd700]/60` with:
   ```
   className="w-full bg-[#0d1b2e]/60 border border-[#7ec8e3]/20 rounded-lg px-4 py-2.5 text-white placeholder-[#8bacc8]/50 focus:outline-none focus:border-[#7ec8e3]/70 focus:shadow-[0_0_12px_rgba(126,200,227,0.2)] transition-all"
   ```

7. **Labels** — `text-white/70` → `text-[#8bacc8] text-sm font-inter`

8. **Submit Button** — Primary variant in `Button.tsx` should change (see Button section below). Here, main CTA should use new primary color.

9. **Link** `text-[#ffd700]` → `text-[#7ec8e3] hover:text-[#c5a3ff]`

10. **Error alert** — keep structure, change colors:
    ```
    className="mb-4 p-3 bg-[#ff6b8a]/10 border border-[#ff6b8a]/30 rounded-lg text-[#ff6b8a] text-sm"
    ```

11. **Add decorative element** below logo — a thin horizontal divider with anime flair:
    ```jsx
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#7ec8e3]/30" />
      <span className="text-[#7ec8e3]/40 text-xs font-cinzel tracking-widest">◈ ◈ ◈</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#7ec8e3]/30" />
    </div>
    ```
    Place this between the logo block and the form card.

---

### 2. `apps/web/src/components/ui/Button.tsx`

**Target:** Anime RPG button style — no harsh gold fills, use translucent panels with glowing borders.

#### Replace the entire `variantClass` object:

```tsx
const variantClass: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-[#2a6496] to-[#1a3f6f] text-white font-bold border border-[#7ec8e3]/50 hover:border-[#7ec8e3] hover:shadow-[0_0_20px_rgba(126,200,227,0.35)] disabled:opacity-40 disabled:cursor-not-allowed',
  danger:
    'bg-gradient-to-b from-[#7a1e35] to-[#4d1322] text-white font-semibold border border-[#ff6b8a]/40 hover:border-[#ff6b8a] hover:shadow-[0_0_16px_rgba(255,107,138,0.3)] disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent border border-[#7ec8e3]/30 text-[#7ec8e3] hover:bg-[#7ec8e3]/10 hover:border-[#7ec8e3]/70 disabled:opacity-40 disabled:cursor-not-allowed',
};
```

#### Replace the base className in the button element — add font-cinzel and tracking:

```tsx
className={[
  'rounded-xl transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#7ec8e3]/60 font-cinzel tracking-wide',
  variantClass[variant],
  sizeClass[size],
  className,
].join(' ')}
```

---

### 3. `apps/web/src/pages/LobbyPage.tsx`

**Current look:** Casino header with gold logo and logout button.

**Target:** Blue Archive school-lobby style — horizontal nav bar with anime-style user card, soft panel room list.

#### Changes:

1. **Page wrapper** — replace gradient with:
   ```
   className="min-h-screen bg-[#0d1b2e] relative"
   ```
   Add bokeh layer as first child.

2. **Header** `<header>`:
   ```
   className="relative z-10 border-b border-[#7ec8e3]/10 bg-[#0a1628]/80 backdrop-blur-md px-6 py-3"
   ```

3. **Logo text** in header:
   ```
   // Before: text-[#ffd700]
   // After:  text-white font-cinzel tracking-widest
   ```
   Change `♠ POKER GACHA` → add a small blue glow:
   ```
   className="font-cinzel text-2xl font-bold text-white drop-shadow-[0_0_12px_rgba(126,200,227,0.5)]"
   ```

4. **User chip display** `◈ {chips}`:
   ```
   // Before: text-[#ffd700] font-mono text-xs
   // After:  text-[#ffe082] font-jetbrains text-xs bg-[#ffe082]/10 px-2 py-0.5 rounded-full border border-[#ffe082]/20
   ```

5. **Section title** "Open Rooms":
   ```
   className="font-cinzel text-xl text-white tracking-wide"
   ```
   Subtitle `text-white/40` → `text-[#8bacc8] text-sm`

6. **Gacha/Collection quick-nav buttons** (added in previous session) — update from plain bordered buttons to anime-style icon cards:
   ```jsx
   <button
     onClick={() => navigate('/gacha')}
     className="flex flex-col items-center gap-1.5 bg-gradient-to-b from-[#1a2744]/80 to-[#0f1e38]/80 border border-[#7ec8e3]/20 rounded-2xl px-8 py-4 text-[#7ec8e3] hover:border-[#7ec8e3]/60 hover:shadow-[0_0_20px_rgba(126,200,227,0.15)] transition-all"
   >
     <span className="text-3xl">✨</span>
     <span className="font-cinzel text-xs uppercase tracking-widest">Gacha</span>
   </button>
   
   <button
     onClick={() => navigate('/collection')}
     className="flex flex-col items-center gap-1.5 bg-gradient-to-b from-[#1a2744]/80 to-[#0f1e38]/80 border border-[#c5a3ff]/20 rounded-2xl px-8 py-4 text-[#c5a3ff] hover:border-[#c5a3ff]/60 hover:shadow-[0_0_20px_rgba(197,163,255,0.15)] transition-all"
   >
     <span className="text-3xl">📦</span>
     <span className="font-cinzel text-xs uppercase tracking-widest">Collection</span>
   </button>
   ```

---

### 4. `apps/web/src/components/lobby/RoomList.tsx`

**Target:** Blue Archive mission-list style — each room is a clean anime "quest card" with soft hover lift.

#### Changes:

1. **Room card wrapper** — replace `bg-white/5 hover:bg-white/8 border border-white/10` with:
   ```
   className="flex items-center justify-between bg-gradient-to-r from-[#1a2744]/70 to-[#0f1e38]/70 hover:from-[#1e2f52]/80 hover:to-[#132040]/80 border border-[#7ec8e3]/10 hover:border-[#7ec8e3]/30 rounded-2xl px-5 py-4 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(126,200,227,0.1)] hover:-translate-y-0.5"
   ```

2. **Room name** `font-semibold text-white` → `font-cinzel text-white text-base tracking-wide`

3. **Status dot colors**:
   ```tsx
   const statusColor: Record<Room['status'], string> = {
     waiting:  'text-[#7ee8a2]',   // anime mint green
     playing:  'text-[#7ec8e3]',   // sky blue
     finished: 'text-white/20',
   };
   ```

4. **Player count and min bet** `text-white/40` → `text-[#8bacc8]`. Replace emoji with styled icons:
   ```jsx
   <span className="text-[#8bacc8]">👥 {room.playerCount} / {room.maxPlayers}</span>
   <span className="text-[#ffe082]/70">◈ min {room.minBet}</span>
   ```

5. **Empty state** — add simple anime-style illustration placeholder:
   ```jsx
   <div className="text-center py-16 flex flex-col items-center gap-3">
     <div className="text-5xl opacity-30">🃏</div>
     <p className="text-[#8bacc8] font-cinzel tracking-widest text-sm">No rooms open yet</p>
     <p className="text-[#8bacc8]/50 text-xs">Be the first to create a room</p>
   </div>
   ```

6. **Loading state** — replace pulse text with anime-style:
   ```jsx
   <div className="flex flex-col items-center justify-center py-16 gap-3">
     <div className="w-8 h-8 border-2 border-[#7ec8e3]/30 border-t-[#7ec8e3] rounded-full animate-spin" />
     <p className="text-[#8bacc8] text-sm font-cinzel tracking-widest">Loading…</p>
   </div>
   ```

---

### 5. `apps/web/src/components/lobby/CreateRoomModal.tsx`

**Target:** Genshin Impact dialog/quest-creation panel with ornate frame feel.

#### Changes:

1. **Backdrop** — keep the logic, update:
   ```
   className="fixed inset-0 bg-[#0d1b2e]/80 backdrop-blur-sm z-50 flex items-center justify-center px-4"
   ```

2. **Modal panel** — replace `bg-[#1a1730] border border-white/10`:
   ```
   className="relative bg-gradient-to-b from-[#1a2744] to-[#0f1e38] border border-[#7ec8e3]/20 rounded-2xl p-8 w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden"
   ```
   Add inside the panel as first children (decorative top header stripe):
   ```jsx
   {/* Decorative header stripe */}
   <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#7ec8e3]/50 to-transparent" />
   {/* Corner ornaments */}
   <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#7ec8e3]/40" />
   <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#7ec8e3]/40" />
   <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#7ec8e3]/40" />
   <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#7ec8e3]/40" />
   ```

3. **Modal title** `"Create Room"` `text-[#ffd700]` → `text-[#7ec8e3] font-cinzel tracking-widest text-xl`

4. **Labels** `text-white/70` → `text-[#8bacc8] text-sm`

5. **Input, range, select** — use same input style as Login page (deep navy bg, sky border).

6. **Select dropdown** — add explicit `appearance-none` and the same border treatment as inputs. Set `option` background with `bg-[#0d1b2e]`.

---

### 6. `apps/web/src/components/game/GameTable.tsx`

**Target:** Blue Archive combat map / Genshin domains — anime battlefield table.

#### Changes:

1. **Outer wrapper** — `bg-[#0f0c29]` → `bg-[#0d1b2e]`

2. **The oval table** — replace casino green felt:
   ```
   // Before
   className="relative w-[80%] h-[60%] bg-[#1a6b3c] border-8 border-[#ffd700]/30 rounded-[200px] shadow-[0_0_50px_rgba(0,0,0,0.5)]..."
   
   // After
   className="relative w-[80%] h-[60%] bg-gradient-to-br from-[#1a3a5c] to-[#0d2240] border-4 border-[#7ec8e3]/20 rounded-[200px] shadow-[0_0_60px_rgba(126,200,227,0.1)] ring-1 ring-inset ring-[#7ec8e3]/5..."
   ```

3. **Pot Display**:
   ```
   // Label text: text-[#7ec8e3] → keep sky blue, but change class
   className="absolute top-1/4 flex flex-col items-center"
   // "Total Pot" label
   className="font-cinzel text-[#7ec8e3]/80 text-xs uppercase tracking-widest"
   // Amount
   // ◈ chip icon color: was text-[#ffd700], change to text-[#ffe082]
   ```

4. **Game phase indicator** pill (top center):
   ```
   // Before: border-[#ffd700]/30
   // After:
   className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0d1b2e]/80 backdrop-blur-sm px-6 py-2 rounded-full border border-[#7ec8e3]/20 shadow-[0_0_12px_rgba(126,200,227,0.1)]"
   // Inner text: text-[#ffd700] → text-[#7ec8e3]
   ```

5. **Showdown overlay** — replace dark black overlay with a more vivid anime dramatic scene:
   ```
   // Overlay bg: bg-black/75 → bg-[#0d1b2e]/90 backdrop-blur-sm
   ```

6. **"SHOWDOWN" title**:
   ```
   // Remove the yellow glow, replace with blue + pink split:
   className="font-cinzel text-5xl font-bold text-white tracking-[0.3em] drop-shadow-[0_0_30px_rgba(126,200,227,0.8)]"
   ```

7. **Winner announcement banner**:
   ```
   // Before: bg-[#ffd700]/20 border-[#ffd700]/60
   // After:
   className="bg-gradient-to-r from-[#7ec8e3]/10 to-[#c5a3ff]/10 border border-[#7ec8e3]/40 px-8 py-3 rounded-full"
   // text: text-[#ffd700] → text-white, trophy + username
   ```

8. **Showdown player card reveal area** — wrap each player reveal in a styled card box:
   ```
   className="flex flex-col items-center gap-3 bg-[#1a2744]/60 border border-[#7ec8e3]/15 rounded-2xl px-6 py-4"
   ```

9. **Hand description badge** (e.g. "Full House"):
   ```
   // Before: bg-[#ffd700]/20 border-[#ffd700]/40
   // After:
   className="bg-[#7ec8e3]/10 border border-[#7ec8e3]/30 px-4 py-1 rounded-full"
   // text: text-[#ffd700] → text-[#7ec8e3]
   ```

10. **"Play Again" button**:
    ```
    // Before: bg-[#ffd700] text-[#0f0c29]
    // After:
    className="mt-4 bg-gradient-to-b from-[#2a6496] to-[#1a3f6f] text-white font-cinzel font-bold uppercase tracking-widest px-10 py-3 rounded-xl text-lg border border-[#7ec8e3]/50 hover:shadow-[0_0_24px_rgba(126,200,227,0.4)] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
    ```

11. **Chip delta text** — keep green/red logic, but use anime-friendly shades:
    - Positive: `text-[#7ee8a2]` (mint)
    - Negative: `text-[#ff6b8a]` (soft pink-red)

---

### 7. `apps/web/src/components/game/CommunityCards.tsx`

**Target:** Anime card design — cards look more like a gacha card game, not a physical deck.

#### Changes:

1. **Dealt card** wrapper:
   ```
   // Before: bg-white rounded-md border-2 border-[#ffd700]
   // After:
   className="w-full h-full bg-gradient-to-b from-white to-[#e8f4fd] rounded-xl border border-[#7ec8e3]/60 shadow-[0_4px_16px_rgba(126,200,227,0.25)] flex flex-col p-2 relative overflow-hidden"
   ```

2. **Empty card slot**:
   ```
   // Before: border-[#ffd700]/10
   // After:
   className="w-full h-full border border-[#7ec8e3]/10 rounded-xl bg-[#1a2744]/30 flex items-center justify-center"
   // inner ◈ text-[#7ec8e3]/10
   ```

3. **Card rank text** — cards have white bg so keep `text-[#0f0c29]` for rank. **Red suits** keep `text-red-600`, black suits keep `text-[#0f0c29]`.

4. **Add a subtle shimmer gradient overlay inside each dealt card** (anime card shine):
   ```jsx
   {/* Shine overlay */}
   <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none rounded-xl" />
   ```

---

### 8. `apps/web/src/components/game/PlayerSeat.tsx`

**Target:** Anime character portrait frame — each player seat looks like a character card from Blue Archive.

#### Changes:

1. **Avatar container** — the pulsing active ring:
   ```
   // Active player
   className="relative w-20 h-20 rounded-full border-2 overflow-hidden shadow-2xl transition-all border-[#7ec8e3] ring-4 ring-[#7ec8e3]/25 shadow-[0_0_20px_rgba(126,200,227,0.4)]"
   
   // Inactive player
   className="relative w-20 h-20 rounded-full border-2 overflow-hidden shadow-xl transition-all border-white/10"
   ```
   Remove `animate-pulse` — replace with Framer Motion `animate={{ boxShadow: [...] }}` pulse or just keep static glow.

2. **Username badge** — replace punchy gold with softer anime style:
   ```
   // Before: bg-[#ffd700] text-[#0f0c29]
   // After:
   className="bg-[#1a2744]/90 text-[#7ec8e3] border border-[#7ec8e3]/30 px-3 py-0.5 rounded-full font-cinzel text-xs tracking-wide shadow-sm"
   // If isMe: add extra border glow: border-[#7ec8e3]/70
   ```

3. **Chip amount display** inside avatar (bottom overlay):
   ```
   // chips label text
   className="text-[10px] text-[#8bacc8] uppercase block"
   // chip amount
   className="font-jetbrains text-[#ffe082] text-sm leading-none"
   ```

4. **Bet bubble** — `border-[#ffd700]/30 text-[#ffd700]` → `border-[#ffe082]/30 text-[#ffe082]`

5. **CardBack design** — change the repeating diagonal stripe to a blue anime motif:
   ```jsx
   const CardBack: React.FC = () => (
     <div
       className="w-9 h-14 rounded border border-[#7ec8e3]/20 shadow-md flex items-center justify-center overflow-hidden"
       style={{ background: 'linear-gradient(135deg, #0d1b2e 0%, #1a2744 50%, #0d1b2e 100%)' }}
     >
       <span className="text-[#7ec8e3]/20 text-base">◈</span>
     </div>
   );
   ```

6. **Folded player** — keep `opacity-50 grayscale` logic.

---

### 9. `apps/web/src/components/game/BettingControls.tsx`

**Target:** Blue Archive skill bar — action buttons look like anime skill icons, not casino chips.

#### Changes:

1. **Main wrapper** — keep position fixed, update background:
   ```
   className="fixed bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#0a1628]/95 via-[#0a1628]/60 to-transparent flex items-end justify-center pb-8 px-4 gap-4"
   ```

2. **Fold button**:
   ```
   color="bg-gradient-to-b from-[#4a1020]/80 to-[#2d0a15]/80"
   borderColor="border-[#ff6b8a]/40 hover:border-[#ff6b8a]/80"
   // text keeps text-white, but add label color change in ActionButton below
   ```

3. **Call/Check button**:
   ```
   color="bg-gradient-to-b from-[#0e3d5c]/80 to-[#082030]/80"
   borderColor="border-[#7ec8e3]/40 hover:border-[#7ec8e3]/80"
   ```

4. **Raise button**:
   ```
   color="bg-gradient-to-b from-[#2a1a4a]/80 to-[#180f30]/80"
   borderColor="border-[#c5a3ff]/40 hover:border-[#c5a3ff]/80"
   ```

5. **Raise slider container**:
   ```
   className="flex items-center gap-3 bg-[#0a1628]/70 border border-[#7ec8e3]/15 px-4 py-2 rounded-xl backdrop-blur-sm"
   // slider: accent-[#7ec8e3]
   // amount text: text-[#7ec8e3]
   ```

6. **`ActionButton` component** — update the base className:
   ```tsx
   className={`
     ${color} ${borderColor} border px-7 py-3 rounded-xl font-cinzel text-white uppercase tracking-widest text-sm
     hover:shadow-[0_0_20px_rgba(126,200,227,0.2)] transition-all duration-200
   `}
   ```

---

### 10. `apps/web/src/pages/GachaPage.tsx` (created in previous session)

**Target:** Genshin Impact gacha banner — dramatic, sparkly, anime wish screen.

#### Changes:

1. **Page bg**: Already `bg-gradient-to-br from-[#0f0c29]...` → change to `bg-[#0d1b2e]` with bokeh layer.

2. **Header** — use same header style as Lobby (dark navy, blue border).

3. **Banner title & description** — title stays white+cinzel. Description `text-white/50` → `text-[#8bacc8]`.

4. **Rate badges** — already blue/purple/gold — keep those, they already fit the anime palette.

5. **Pull buttons**:
   ```jsx
   // × 1 Pull button
   className="bg-gradient-to-b from-[#1a2744] to-[#0f1e38] border border-[#7ec8e3]/30 text-white font-cinzel font-bold px-8 py-3 rounded-2xl hover:border-[#7ec8e3]/70 hover:shadow-[0_0_20px_rgba(126,200,227,0.2)] transition-all disabled:opacity-40"
   // cost badge: text-[#ffe082]
   
   // × 10 Pull button (featured)
   className="bg-gradient-to-b from-[#2a1a4a] to-[#180f30] border border-[#c5a3ff]/50 text-[#c5a3ff] font-cinzel font-bold px-8 py-3 rounded-2xl hover:border-[#c5a3ff] hover:shadow-[0_0_24px_rgba(197,163,255,0.3)] transition-all disabled:opacity-40"
   ```

6. **Spinner** — `border-[#ffd700]` → `border-t-[#7ec8e3]`

7. **Result item cards** (`ItemCard`) — already has rarity styling, update SSR glow color to keep `#ffd700` only for SSR (gold = SSR only), SR uses purple `#c5a3ff`, R uses `#7ec8e3`.

8. **"Pull Again" / "My Collection →" buttons** — use ghost-style with blue border.

---

### 11. `apps/web/src/pages/CollectionPage.tsx` (created in previous session)

**Target:** Blue Archive student album / inventory grid.

#### Changes:

1. **Page bg** → same as all other pages (`bg-[#0d1b2e]` + bokeh).

2. **Header** → same navy header style.

3. **Stats row** (R/SR/SSR counts) — wrap each in:
   ```
   className="border border-[#7ec8e3]/15 bg-[#1a2744]/60 rounded-xl px-4 py-2 text-center"
   ```

4. **Filter buttons** — active state: change `bg-[#ffd700] text-[#0f0c29]` → `bg-[#7ec8e3]/20 border-[#7ec8e3] text-[#7ec8e3]`. Inactive: keep existing `border-white/20 text-white/60`.

5. **Empty state "Go Pull" button** — use new primary Button style (blue gradient).

6. **Collection grid item** (`CollectionCard`) — update SSR glow to keep `#ffd700` for SSR only. Update SR → `#c5a3ff` lavender glow / border.

---

## 🧩 New Shared Component to Add

### `apps/web/src/components/ui/PageBackground.tsx` (NEW FILE)

Create this reusable component and use it on all pages instead of repeating the bokeh code:

```tsx
import React from 'react';

export const PageBackground: React.FC = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
    <div className="absolute inset-0 bg-[#0d1b2e]" />
    <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#7ec8e3]/4 blur-[100px]" />
    <div className="absolute bottom-[-5%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#c5a3ff]/4 blur-[120px]" />
    <div className="absolute top-[40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-[#ffe082]/3 blur-[80px]" />
    {/* Star dots — small static sparkles */}
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/20"
        style={{
          width:  `${1 + (i % 3)}px`,
          height: `${1 + (i % 3)}px`,
          top:    `${5 + (i * 4.7) % 90}%`,
          left:   `${2 + (i * 5.1) % 95}%`,
          opacity: 0.1 + (i % 5) * 0.05,
        }}
      />
    ))}
  </div>
);
```

Then on every page, add `<PageBackground />` as the **first child** of the outermost div (instead of repeating the inline bokeh divs).

---

## 🔤 Typography Usage Rules (Enforce Consistently)

| Use case | Font | Tailwind |
|----------|------|----------|
| Page / section titles | Cinzel | `font-cinzel tracking-widest` |
| Button labels | Cinzel | `font-cinzel tracking-wide uppercase` |
| Card / item names | Cinzel | `font-cinzel` |
| Body text, descriptions | Inter | `font-inter` (default, no class needed) |
| Chip amounts, numbers, bets | JetBrains Mono | `font-jetbrains` |
| Rarity labels (SR, SSR) | Cinzel | `font-cinzel font-bold` |

---

## ✅ Checklist for Gemini

For each file, confirm:

- [ ] All `#ffd700` gold → replaced with `#7ec8e3` sky blue **except**: chip amounts, SSR rarity label, special trophy icons (keep `#ffe082` warm gold there)
- [ ] All `from-[#0f0c29] via-[#302b63] to-[#24243e]` gradients → replaced with `bg-[#0d1b2e]`
- [ ] All `bg-white/5 border-white/10` panels → replaced with `from-[#1a2744]/90 to-[#0f1e38]/90 border-[#7ec8e3]/20`
- [ ] `bg-[#1a6b3c]` table felt → replaced with `from-[#1a3a5c] to-[#0d2240]`
- [ ] No logic, state, hooks, or TypeScript interfaces changed
- [ ] All `data-testid` attributes preserved exactly
- [ ] `font-cinzel` applied to all titles and buttons
- [ ] `font-jetbrains` applied to all number/chip displays
- [ ] `PageBackground` component used on all pages
- [ ] `pnpm typecheck` passes with zero errors after changes

---

## 📂 Files to Edit

```
apps/web/src/
  index.css                               ← no change needed (fonts already loaded)
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    LobbyPage.tsx
    GachaPage.tsx
    CollectionPage.tsx
  components/
    ui/
      Button.tsx
      PageBackground.tsx                  ← CREATE NEW
    lobby/
      RoomList.tsx
      CreateRoomModal.tsx
    game/
      GameTable.tsx
      PlayerSeat.tsx
      CommunityCards.tsx
      BettingControls.tsx
```
