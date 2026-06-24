# FORTA

FORTA Studio's marketing site — built with [Astro](https://astro.build) for fast, low-JS, SEO-friendly pages.

## Stack

- [Astro](https://astro.build) — static-first rendering, file-based routing, content collections
- [Bun](https://bun.sh) — package manager & script runner
- [Three.js](https://threejs.org) — used in `src/lib/scene.js`

## Project structure

```
src/
  components/   Header, Footer, SEO
  layouts/      Base.astro
  lib/          scene.js (Three.js scene), site.js
  content/      journal/ (Markdown posts via Content Collections)
  pages/        index, about, services, contact, journal/[slug], rss.xml
  config.ts     site name, nav, social links, contact info
```

Edit [src/config.ts](src/config.ts) to update brand name, tagline, contact email, nav, and social links.

## Setup

```bash
bun install
```

## Commands

| Command            | Action                                      |
| ------------------- | -------------------------------------------- |
| `bun run dev`       | Start local dev server at `localhost:4321`   |
| `bun run build`     | Build production site to `./dist/`           |
| `bun run preview`   | Preview the production build locally         |
| `bun run astro ...` | Run any Astro CLI command                    |

## TODO before launch

- [ ] Set the real domain in [src/config.ts](src/config.ts) (`url`) and [astro.config.mjs](astro.config.mjs) (`site`) — must match
- [ ] Replace `formspreeId: 'your-id'` in [src/config.ts](src/config.ts) with the real [Formspree](https://formspree.io) form ID
- [ ] Replace social links (`#`) in [src/config.ts](src/config.ts) with real profile URLs
- [ ] Add real journal content under `src/content/journal/`
