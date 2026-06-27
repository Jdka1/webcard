# webcard — agent context

Personal website for Aryan Mehra. Minimalist dark webcard: name, role, experience table, social links.

## Stack

Plain HTML/CSS with no build step. Served statically.

```
index.html       — single page, all content lives here
src/styles.css   — all styles
```

No JavaScript. No framework. No bundler.

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
Aryan Mehra_                  ← h1 + blinking CSS cursor
FDAI @ Palantir · Stanford CE ← tagline

─────────────────────────────

Palantir    Forward Deployed AI Engineer
8VC         Engineering Fellow
Sauron      Machine Learning Engineer
Stanford    B.S. Computer Engineering

─────────────────────────────

X  GitHub  LinkedIn  YouTube
```

## What's planned

- Detail pages for experience, projects, writing, photography (linked from the main card)
- The main card's structure is intentionally frozen; expansions go in sub-pages

## Key decisions

- **No React / no build step** — the site is static content; a framework would add complexity with no benefit at this scale
- **Left-aligned layout** — content sits at ~40% from the left on wide screens, not centered, to feel intentional rather than generic
- **Experience column widths** — org column is fixed at 100px; don't widen it
