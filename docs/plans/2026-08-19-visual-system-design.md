# BOOM visual system — design

Approved 2026-08-19. Reference: getshaare.com.

## The finding

BOOM and Shaaré have effectively the same page structure — hero, services, how it works,
availability, for-offices, testimonials. Copying their layout would change nothing.

Measured on both sites with the same script:

|                  | Shaaré            | BOOM (before) |
|------------------|-------------------|---------------|
| Type sizes       | 4 (14/16/24/48)   | 18 (7→81px)   |
| Font weights     | 2 (400, 500)      | 7 (400→950)   |
| Font families    | 1 (Satoshi)       | 3             |
| Accent colours   | 1 (#FF5416)       | 3             |
| Distinct colours | ~10               | 27            |

Shaaré reads as calm because a visitor only ever learns four sizes and one accent.

## Why it drifted

Three stylesheets are a minified blob plus a stack of appended overrides:
`home.module.css` (4,524 chars on line 1), `QuoteFlow.module.css` (5,455), and
`AdminConsole.module.css` (one 9,706-char line). Every fix gets appended to beat the blob
rather than edit it, so values multiply. This is a structural cause, not carelessness.

## Decisions

- **Keep Georgia for headlines.** The serif is BOOM's distinguishing mark; going all-sans
  would make it a Shaaré copy. Restraint comes from everything else.
- **Scope: every page including admin.**
- **Visual system only.** No new sections; named-cleaner profiles and a recruitment CTA are
  deferred until individual staff portraits exist.

## The system

Type scale (5 steps): 13 / 15 / 19 / 30 / 48
Weights: 400 and 600 for sans; Georgia 400 for display.
Colour: navy ink, warm off-white ground, ONE accent (`--accent`), plus tinted panels.
Spacing: 4px base — 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 112.
Radii: 8 / 16 / 999.

## Approach

Tokens first, then rewrite the three blob stylesheets against them; token-sweep the
already-readable modules (`about`, `ServiceCarousel`, `TestimonialSlider`, `SiteNav`).
Public pages first, verify, then admin — so an admin regression stays isolated.

## Acceptance criteria (machine-checked)

- ≤5 type sizes; 2 sans weights + the serif
- 1 accent; ≤12 distinct colours
- 0 contrast failures (currently 0 — must not regress)
- 0 accidental photo cropping (currently 0 — must not regress)
- tests pass, build succeeds
