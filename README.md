# 2026 Sydney x Melbourne

Traditional Chinese family travel website for the `Recommendation` plan in Notion.

## Local Development

```bash
npm install
npm run dev
```

## Notion Sync

Create `.env` from `.env.example`, then run:

```bash
npm run sync:notion
```

The site reads `src/data/trip.json`, so the generated snapshot can be deployed as a static GitHub Pages site.

## Build

```bash
npm run build
```
