# CONTEXT.md — PAGAF Project Reconnection Document
> **Last updated:** 2026-03-26 | **Version:** 3.0 | **Session:** Initial build complete
> 
> This file is the single source of truth for AI-assisted development sessions.
> Read this file first when reconnecting to understand the project state.

## Project Overview

**PAGAF** (Precision AG for All Farmers) is a thin-client precision agriculture web app that runs entirely on GitHub Pages. Farmers select fields on USDA NAIP aerial imagery, draw field boundaries, generate variable-rate prescription maps, and export data directly to farm equipment (John Deere, Case IH, Trimble, etc.).

- **Live URL:** https://precisionagtech.github.io
- **Repo:** https://github.com/precisionAGTech/precisionagtech.github.io
- **Project Board:** https://github.com/orgs/precisionAGTech/projects/1
- **Powered by:** [nltGIS.ai](https://nltgis.ai)
- **Organization:** precisionAGTech
- **GitHub User:** ghermay

## Architecture

```
THIN CLIENT (GitHub Pages - Static HTML/CSS/JS)
├── index.html          — Product site shell + app layout
├── css/pagaf.css       — All styles (navbar, sidebar, map, modals)
├── js/pagaf.js         — All logic (map, drawing, analysis, export)
├── CONTEXT.md          — This file (AI reconnection document)
└── README.md           — Project documentation

EXTERNAL DATA SOURCES (client-side fetch, no backend)
├── NAIP Imagery        — USDA APFO (gis.apfo.usda.gov) — raster tiles
├── Satellite           — Esri World Imagery — raster tiles  
├── Dark Basemap        — CARTO Dark Matter — vector tiles
├── Geocoding           — Nominatim (OpenStreetMap) — REST API
├── Geometry            — Turf.js — client-side spatial analysis
└── Map Engine          — MapLibre GL JS v4.1.2
```

## Tech Stack

| Component | Technology | CDN/Source |
|-----------|-----------|------------|
| Map Engine | MapLibre GL JS 4.1.2 | unpkg CDN |
| Spatial Analysis | Turf.js 7 | unpkg CDN |
| Basemap (default) | USDA NAIP via APFO | gis.apfo.usda.gov |
| Basemap (satellite) | Esri World Imagery | arcgisonline.com |
| Basemap (dark) | CARTO Dark Matter | basemaps.cartocdn.com |
| Geocoding | Nominatim | nominatim.openstreetmap.org |
| Fonts | DM Sans + JetBrains Mono | Google Fonts |
| Hosting | GitHub Pages | precisionagtech.github.io |
| Design Reference | nltGIS.ai | nltgis.ai |

## Current Feature State (v3.0)

### DONE ✅
- Professional navbar with dropdown menus (Platform, Data Layers, Equipment, Docs)
- Welcome modal with 4-step onboarding (localStorage persistence)
- Keyboard shortcuts (D=draw, R=rect, Esc=cancel, F=zoom, S=sidebar, ?=help)
- Collapsible sidebar with smooth animation
- Floating map toolbar (draw, rect, measure, zoom-to-fields, toggle sidebar)
- NAIP aerial imagery from USDA as default basemap
- Layer toggle: NAIP / Satellite / Dark Map
- Polygon and rectangle field drawing with Turf.js area calculation
- Draw line preview and vertex indicators during drawing
- Cancel drawing with Escape key
- Right-click coordinate popup on map
- 6 prescription types: NDVI, Seeding, Fertilizer, Pesticide, Fungicide, Yield
- Prescription grid visualization (color-coded variable rate overlay)
- GeoJSON export download
- Equipment connector UI: John Deere, Case IH/NH, Trimble/AgLeader, ISO-XML
- Toast notifications and analysis results panel
- Status bar with layer, coordinates, zoom, field count, total acres
- Nominatim geocoding search with Enter key hint
- Quick navigation buttons for major ag regions
- Responsive CSS with mobile breakpoints
- Site deployed at root domain (precisionagtech.github.io)

### IN PROGRESS 🔄
- None currently

### TODO 📋 (see Issues + Project Board)
- #2: Connect live USDA data layers (SSURGO, CDL, weather)
- #3: Real Shapefile/GeoTIFF export (client-side libs)
- #4: Equipment connectors (ISO-XML, John Deere API, ADAPT)
- #5: File upload for field boundaries (GeoJSON/Shapefile/KML)
- #6: GitHub Actions CI/CD
- #7: CONTEXT.md (this file) ← IN PROGRESS
- #8: Update README.md
- #9: Mobile responsive UX
- #10: Real NDVI from Sentinel-2

## File Structure Details

### index.html
- Navbar with 3 dropdown menus (Platform, Data Layers, Equipment)
- App layout: sidebar (340px) + map area (flex)
- 4-step workflow sidebar: Find → Draw → Application → Export
- Welcome modal, keyboard shortcuts modal
- Floating map toolbar, map hint bar, status bar
- Results panel (analysis output)
- Toast notification container

### css/pagaf.css
- CSS variables for design tokens (colors, spacing, transitions)
- Navbar + dropdown panel styles
- Sidebar + workflow step styles (active/completed states)
- Map toolbar + map hint + map status bar
- Modal styles (welcome + shortcuts)
- Results panel + analysis items
- Export grid + equipment badges
- MapLibre GL overrides (dark theme)
- Responsive breakpoints (900px, 480px)

### js/pagaf.js (v3.0)
- IIFE wrapper, strict mode
- BASEMAPS config: naip, satellite, dark
- State management: map, fields[], drawPoints[], currentStep, isDrawing, etc.
- initApp() → calls all init functions
- Map: MapLibre GL with NAIP tiles, navigation controls, scale, attribution
- Navbar: dropdown open/close, action routing, layer switching, equipment selection
- Sidebar: collapse/expand with map resize
- Modals: welcome (localStorage), shortcuts (toggle)
- Keyboard: D/R/Esc/F/1-4/S/?/ shortcuts
- Map toolbar: draw, rect, measure, zoom-to-fields, fullscreen
- Drawing: polygon (click + dblclick), rectangle (2 clicks), cancel, preview
- Analysis: 6 prescription configs, loading spinner, prescription grid generation
- Export: GeoJSON download, stub for other formats
- Utils: setEl(), showToast()

## Data Source Details

### NAIP (National Agriculture Imagery Program)
- **URL:** `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/tile/{z}/{y}/{x}`
- **Coverage:** CONUS (Continental US)
- **Resolution:** 1m (varies by state/year)
- **Tile format:** Raster (256px)
- **Max zoom:** 19
- **No API key required**

### Esri World Imagery
- **URL:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **Global coverage**
- **No API key required for basic usage**

## Design Decisions
1. **Thin client only** — No backend, no server, no database. Everything runs client-side on GitHub Pages.
2. **NAIP as default** — USDA aerial imagery is the best free source for US farmland at field-level resolution.
3. **nltGIS.ai design language** — Dark theme, glass-morphism panels, DM Sans typography, green accents.
4. **Tool-first UX** — The app IS the site. No marketing pages, no scroll. Immediate access to tools.
5. **Equipment export priority** — The end goal is getting data into John Deere, Case IH, Trimble tractors.
6. **OGC compliance** — All exports use open standards (GeoJSON, Shapefile, ISO-XML, ADAPT).

## Known Issues / Workarounds
- NAIP tiles can be slow to load at zoom 4-8; they sharpen at zoom 10+
- Welcome modal requires 2 clicks to dismiss on some browsers (event propagation)
- "Create more" checkbox on GitHub Issues form doesn't reliably prevent navigation
- CARTO Dark Matter tiles appear very dark at low zoom (looks like no map loading)

## How to Continue Development
1. Read this CONTEXT.md file
2. Check the Project Board: https://github.com/orgs/precisionAGTech/projects/1
3. Pick the next issue from the board
4. Edit files directly on GitHub (no local dev needed)
5. Commit to main branch — GitHub Pages auto-deploys
6. Update this CONTEXT.md after significant changes

## Related Projects
- **nltGIS.ai** — AI-Native Spatial Intelligence platform (design reference)
- **pagaf.nltmso.com** — Original PAGAF site (migrated from)
