# webcard — agent context

Personal website for Aryan Mehra. Minimalist dark webcard: name, role, experience table, social links.

## Stack

Plain HTML/CSS with no build step. Served statically.

```
index.html                — main webcard
photography/index.html    — photography sub-page
src/styles.css            — all styles (main + photo page)
src/gallery.js            — marquee scroll + lightbox logic
public/photography/       — full-resolution photo assets
TODO.md                   — small markdown task list
```

No framework. No bundler.

## Running locally

```bash
npm start        # python3 -m http.server 5173
```

Then open http://localhost:5173.

## Design principles

- **Dark terminal aesthetic** — near-black background (#0e0e0e), warm off-white text
- **Fragment Mono** — the font choice; keep it unless replacing with something equally unusual
- **No decoration** — no cards, no borders, no shadows, no gradients; content sits directly on the background
- **Minimal interactivity** — CSS-only hover states and the blinking cursor are intentional; avoid adding JS animations or effects unless strongly justified

## Content structure

```
Aryan Mehra_               ← h1 + blinking CSS cursor
FDAI @ Palantir · Stanford ← tagline

─────────────────────────────

currently
├─ Palantir Forward Deployed AI Engineer
└─ 8VC     Engineering Fellow
education
└─ Stanford B.S. Computer Engineering ⇄ B.S. Mathematics
previously
├─ Palantir Meritocracy Fellow
├─ Sauron  Machine Learning Engineer
├─ Hosted ForgeHacks Consumer AI
└─ Oncept Trading LLC FTR Trading · Data Eng

─────────────────────────────

X  GitHub  LinkedIn  YouTube
```

## Experience links and degree shuffle

- Experience uses a terminal-style tree grouped into `currently`, `previously`, and `education`.
- Tree connector lines are drawn in CSS from `.tree-row .org` pseudo-elements so they stay visually connected across row padding.
- Current and previous child rows are full-row links when a destination exists; keep Stanford and Oncept Trading LLC unlinked unless there is a specific destination.
- Work links currently point to:
  - Palantir FDAI: https://www.palantir.com/offerings/palantir-for-hospitals/
  - Palantir Meritocracy Fellow: https://www.palantir.com/careers/meritocracy-fellowship/
  - 8VC: https://8vc.com/fellowships
  - Sauron: https://www.sauron.systems/
  - ForgeHacks: https://www.joinswsh.com/album/dt1kxgap9g4q?view=Top
- The Stanford role intentionally uses a CSS-only inline scramble effect between `B.S. Computer Engineering` and `B.S. Mathematics` because the degree is undecided.
- Keep the scramble in CSS rather than JavaScript. It uses pseudo-element `content` changes in `src/styles.css`, plus a `prefers-reduced-motion` fallback.
- Avoid changing the experience row layout or widening the 100px org column when editing the animation text.

## Photography page (`photography/index.html`)

- `body.photo-page` overrides `--muted` to `#908d88` (lighter than the main page's `#52524e`) so captions and nav text are readable on the dark background
- Photography bio copy uses `--bio-text: #aaa6a0`, slightly lighter than `--muted`, for better long-form readability without changing nav or gallery hint color.
- **Sticky nav** — `.photo-nav` with frosted glass (`backdrop-filter: blur`) and a bottom border; back link hovers to `--accent`
- **Marquee gallery** — `gallery.js` moves all `<figure>` elements into a `.gallery-track`, clones the track, and wraps both in a `.gallery-marquee` that advances across one full track over 180s. The cloned track makes the loop seamless. Hover slows the ambient movement to 40% speed.
- **Gallery manual scrolling** — users can drag the marquee with mouse/touch or use a trackpad two-finger horizontal swipe. The wheel handler only intercepts mostly-horizontal deltas so vertical page scrolling still works normally.
- **Gallery hint** — `.gallery-hint` sits above the images with the text `swipe to scroll`; CSS adds left/right arrows around it with pseudo-elements and keeps bottom spacing so taller images do not crowd the hint. `src/gallery.js` adds `.is-hidden` after the first manual gallery interaction (mouse drag, touch drag, or horizontal wheel swipe).
- **Reload drift guard** — the marquee is intentionally wider than the viewport, so `src/styles.css` clips horizontal overflow at the root/gallery and `src/gallery.js` clears only horizontal scroll offsets on page show/load. This prevents repeated browser reloads from restoring an old horizontal offset and shifting the photo page left.
- **Image sizing** — each `<figure>` keeps a fixed 520px horizontal slot for smooth marquee spacing. `src/gallery.js` wraps each image and caption in `.gallery-media`, a 520×520px flex column that centers the photo/title pair while keeping the title 12px below the rendered image.
- **Captions** — `<figcaption>` fades in alongside the image (both use `opacity` transitions); caption color is `--text` by default and transitions to `--accent` on figure hover
- **Click to open** — the entire `<figure>` (photo + caption) is the click target; cloned figures point to the same lightbox index as their originals
- **Lightbox** — built in JS, appended to `<body>`. Shows the full-res image with caption, prev/next arrows, keyboard nav (←→ Escape). Close button and arrows hover to `--accent`. Clicking outside the frame closes it.
- **Lightbox cursor model** — expanded photo view uses the standard cursor for the overlay, image, caption, and caption whitespace. Only the close, previous, and next buttons use the pointer cursor.
- **Lightbox scroll pause** — opening the lightbox sets `isLightboxOpen` in `src/gallery.js` and adds `body.photo-lightbox-open`; the marquee tick loop checks that state and stops advancing `pos` while the user is focused on an image. Closing the lightbox clears the state and resumes the marquee without a jump.
- **No hover scale on photos** — removed; the lightbox is the primary interaction
- **Print inquiries** — the photography page uses the sentence `For print inquiries, please email arymehr@stanford.edu.` with the email linked to the same `mailto:` target.

## What's planned

- Detail pages for experience, projects, writing (linked from the main card)
- The main card's structure is intentionally frozen; expansions go in sub-pages

## Key decisions

- **No React / no build step** — the site is static content; a framework would add complexity with no benefit at this scale
- **Left-aligned layout** — content sits at ~40% from the left on wide screens, not centered, to feel intentional rather than generic
- **Experience column widths** — org column is fixed at 100px; don't widen it
