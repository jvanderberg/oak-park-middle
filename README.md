# Oak Park Middle

An interactive map for finding Oak Park's two- to six-unit “middle housing” by
exact unit count and year built.

## Quick start

```bash
npm install
npm run pipeline   # fetch and prepare current Cook County data
npm run dev
```

The production build is configured for GitHub Pages at
`https://jvanderberg.github.io/oak-park-middle/`.

## Data

The pipeline combines these public sources:

- Cook County Assessor assessed values, parcel addresses, address points, and
  single/multi-family improvement characteristics
- Cook County GIS parcel geometry
- Village of Oak Park boundary geometry

Middle housing records are limited to property classes 211 and 212 with a
reported apartment count between two and six. For parcels with multiple
building cards, apartment counts and building area are summed; the earliest
reported construction year is used.

## Commands

```bash
npm run dev          Start Vite
npm run build        Type-check and build
npm run check        TypeScript and Biome checks
npm run check:fix    Format and fix lint
npm run pipeline     Rebuild all static data
npm run ingest       Refresh the local SQLite source database
npm run extract      Regenerate map JSON from the database
```
