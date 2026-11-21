# E2E Test Infra: Bitlynn Mobile Web Prototype

## Test Philosophy
- **Opaque-box, requirement-driven**: Derived from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`, independent of internal implementation details.
- **Mobile-first ergonomics**: Every screen, mode, drawer, and modal is verified in touch-enabled mobile Chromium browsers at `375×812` (`iphone-se-375`) and `390×844` (`iphone-14-390`) with `hasTouch: true` and `isMobile: true` (zero hover dependency).
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Scenarios across Tiers 1–4.
- **Resilient Selectors**: Semantic roles (`getByRole`), accessible labels (`aria-label`), Ukrainian text/regexes, and placeholders (`getByPlaceholder`); zero brittle CSS class selectors.

---

## Feature Inventory (Mapped from `PROJECT.md` Features #1–#16)

| # | Feature | Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|--------|:----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | ESLint & Build Gate (Production SSR/CSR) | `ORIGINAL_REQUEST` §Acceptance | 5 | 5 | ✓ | ✓ |
| 2 | Playwright Tooling & Mobile Browser Config | `PROJECT.md` #2 | 5 | 5 | ✓ | ✓ |
| 3 | Root Layout (`lang="uk"`), Fonts & Viewport (`overflow-x: clip`) | `PROJECT.md` #3, R1 | 5 | 5 | ✓ | ✓ |
| 4 | SSR Hydration Safety & `>=16px` Mobile Inputs | `PROJECT.md` #4, R1 | 5 | 5 | ✓ | ✓ |
| 5 | Mobile Shell, Bottom Nav & Classroom Status/Role/PIN Sheet | `PROJECT.md` #5, R1 | 6 | 5 | ✓ | ✓ |
| 6 | Home Hub, 8-Mode Launcher, PIN Entry & Student Profile | `PROJECT.md` #6, R1–R2 | 6 | 5 | ✓ | ✓ |
| 7 | Shared Touch Primitives (`>=44×44 px`) & `ConfettiBurst` VFX | `PROJECT.md` #7, R1, R3 | 5 | 5 | ✓ | ✓ |
| 8 | Client State Persistence (`localStorage`) & Economy Integrity | `PROJECT.md` #8, R2 | 5 | 6 | ✓ | ✓ |
| 9 | Mode 1: Кібер-Шибениця (`CyberGallows` SVG, 33-key UX, Radar) | `PROJECT.md` #9, R2–R3 | 6 | 5 | ✓ | ✓ |
| 10 | Mode 2: Zero-Repeat Бліц (40+ pairs, Step 1→2, No Repeats) | `PROJECT.md` #10, R2–R3 | 6 | 5 | ✓ | ✓ |
| 11 | Mode 3: Екіпаж (15–18 учнів, `StationMap`, Unfreeze, Meeting) | `PROJECT.md` #11, R2–R3 | 6 | 5 | ✓ | ✓ |
| 12 | Mode 4: P2P Біржа допомоги за коїни (Ticket, Reply, No Self-Reply) | `PROJECT.md` #12, R2 | 5 | 5 | ✓ | ✓ |
| 13 | Mode 5: Хаб вчителя (Noise `<65`/`>=65dB`, Templates, Moderation) | `PROJECT.md` #13, R2 | 6 | 5 | ✓ | ✓ |
| 14 | Mode 6: Маркет скінів/VFX & Маскот (`LynnHoloCompanion`, Rank) | `PROJECT.md` #14, R2–R3 | 6 | 5 | ✓ | ✓ |
| 15 | Mode 7: 60-секундні смішні тести (Live Timer, Completion Card) | `PROJECT.md` #15, R2–R3 | 5 | 5 | ✓ | ✓ |
| 16 | Mode 8: Турніри (Cadence, Join/Create Squad, Invest Coins) | `PROJECT.md` #16, R2 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture

### Test Runner & Browser Strategy (`playwright.config.ts`)
- **Base URL**: `http://127.0.0.1:3000`
- **Web Server**: `npx next build && npx next start -p 3000 -H 127.0.0.1` (Windows-compatible; verifies production SSR hydration and self-hosted fonts).
- **Browser Projects** (System Chrome `"chrome"` with `"msedge"` fallback when `%LOCALAPPDATA%\ms-playwright` is absent; explicitly uses `browserName: "chromium"` rather than WebKit `devices` presets):
  - `iphone-se-375`: `viewport: { width: 375, height: 812 }`, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`
  - `iphone-14-390`: `viewport: { width: 390, height: 844 }`, `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true`
- **Pass/Fail Semantics**: Exit code `0` across both mobile projects; zero `console.error`, zero `pageerror`, zero React hydration mismatch warnings, zero horizontal overflow, zero `<44×44 px` primary touch targets, zero `<16px` mobile inputs, and zero clipped/overlapping interactive elements.

### Directory Layout
```
playwright.config.ts
tests/e2e/
├── helpers/
│   └── ergonomics.ts              # Error guards, layer-aware mobile ergonomics audit, .tap() nav/PIN/role helpers
├── shell-and-ergonomics.spec.ts   # Features #1–#8: Shell, HomeHub, MobileBottomNav, ClassroomStatusSheet, Profile, Viewport sweep
├── mode1-hangman.spec.ts          # Feature #9: Кібер-Шибениця (Tier 1, 2, 4 Win + Loss rounds)
├── mode2-blitz.spec.ts            # Feature #10: Zero-Repeat Бліц (Tier 1, 2, 4 5+ consecutive zero-repeat rounds)
├── mode3-cybercrew.spec.ts        # Feature #11: Екіпаж 15–18 (Tier 1, 2, 4 full round to Victory)
├── mode4-peer-exchange.spec.ts    # Feature #12: P2P Біржа допомоги за коїни (Tier 1, 2, 4)
├── mode5-teacher-hub.spec.ts      # Feature #13: Хаб вчителя (Tier 1, 2, 4)
├── mode6-8-sanctum.spec.ts        # Features #14–#16: Маркет скінів/VFX, 60-сек тести, Турніри (Tier 1, 2, 4)
└── tier3-4-cross-feature.spec.ts  # Tier 3 pairwise cross-feature flows & Tier 4 full classroom/student journeys
```

---

## Mobile Ergonomics Invariants (Enforced on Every View & Modal)
1. **Zero Console/Page/Hydration Errors**: Fail on `pageerror`, `console.error`, same-origin `5xx` responses, or React hydration mismatch patterns (`#418`, `#423`, `#425`, `did not match`).
2. **Zero Horizontal Overflow**: `document.documentElement.scrollWidth <= window.innerWidth` (including during `ConfettiBurst` animations and open sheets/modals).
3. **No Clipped or Overlapping Controls**: Layer-separated (`top-chrome`, `bottom-chrome`, `dialog`, `content`) pairwise `boundingBox` overlap check and viewport bounds check; post-scroll bottom clearance check above fixed bottom nav.
4. **Touch Target Minimum (`>= 44×44 px`)**: All primary interactive controls (nav tabs, game letter keys, answer options, modal triggers, action buttons) measure `width >= 43.5 && height >= 43.5`.
5. **iOS Zoom Prevention (`>= 16px`)**: All visible `<input>` (non-range), `<textarea>`, and `<select>` elements compute `font-size >= 16px`.
6. **Touch-First Execution**: All interactions use `.tap()` (zero `.hover()` calls).

---

## Tier 3 — Cross-Feature Pairwise Matrix
| # | Flow | Features Exercised | Verification |
|---|------|--------------------|--------------|
| 3.1 | Teacher Noise `>=65dB` ↔ Game Bonuses (`<65dB` vs `>=65dB`) | #5, #13, #9, #10, #11 | Setting noise `>=65dB` removes quiet bonus in Hangman (`+40` vs `+55`), Mutator (`+50` vs `+75`), Crew (`+30`/`+40` vs `+45`/`+60`); restoring `<65dB` restores bonuses |
| 3.2 | Teacher Adds/Forks Word → Кібер-Шибениця | #13, #9, #8 | Forking/adding `МЕГАБАЙТ` in Teacher Hub immediately updates `Слово 1/N`, Radar `#мільйон`, and playable Hangman word |
| 3.3 | Teacher Approves Pending Blitz → 60s Blitz | #13, #15, #8 | `fun-2` absent from playable 60s Blitz until approved in Teacher Moderation queue, then playable for `+25` coins |
| 3.4 | Game "Спитати клас" → P2P Біржа Prefill | #9, #10, #12 | Tapping Ask Peers in Hangman/Blitz routes to P2P Біржа, opens Ask sheet, prefills topic & question, and publishes ticket |
| 3.5 | Student Profile & PIN Sync Across Modes | #5, #6, #8, #12, #13 | Regenerating PIN in Teacher Hub reflects in Classroom Sheet & HomeHub; updating student callsign persists across reload |
| 3.6 | Market VFX Equip → Game Win Celebration | #7, #14, #9, #10, #11, #15 | Equipping purchased VFX in Market drives `ConfettiBurst` particle theme in game wins without overflow |

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Mode 1 Full Win & Loss Round (`Кібер-Шибениця`) | #3, #4, #5, #7, #9 | Medium |
| 2 | Mode 2 5+ Consecutive Zero-Repeat Rounds (`Zero-Repeat Бліц`) | #3, #4, #5, #7, #10 | Medium |
| 3 | Mode 3 Full Match to Victory (`Екіпаж 15–18`: map, unfreeze, 3 impostors) | #3, #4, #5, #7, #11 | High |
| 4 | Mode 4 P2P Ticket Lifecycle (Ask, Self-Reply Block, Peer Reply, UGC) | #3, #4, #8, #12 | Medium |
| 5 | Mode 5 Teacher Lesson Prep (PIN Regen, Noise, Fork + Word, Moderate) | #3, #4, #5, #13 | Medium |
| 6 | Mode 6–8 Sanctum Progression (Synthesize, Unlock Skin w/o Rank Drop, 60s Blitz, Squads) | #3, #4, #7, #8, #14, #15, #16 | High |
| 7 | 15-Minute Classroom Lesson Journey (Teacher Setup → Student Play → Reload Persistence) | #1–#16 | High |
| 8 | Student Economy Cycle (Earn → Synthesize → Customize Mascot → Fair Squad Invest) | #6, #7, #8, #12, #14, #15, #16 | High |

---

## Coverage Thresholds (Dual Track Compliance)
- **Tier 1**: `>= 5` assertions/cases per feature (`86 >= 80` for 16 features)
- **Tier 2**: `>= 5` boundary/corner cases per feature (`81 >= 80` for 16 features)
- **Tier 3**: Pairwise coverage across all major cross-feature interactions
- **Tier 4**: `8` realistic full-round & multi-mode application scenarios (`8 >= max(5, 16/2)`)
