# CONTEXT.md — PAGAF Project Reconnection Document

> **Last updated:** 2026-03-26 | **Version:** 4.0 | **Session:** Major platform upgrade
>
> This file is the single source of truth for AI-assisted development sessions.
> Read this file first when reconnecting to understand the project state.

## Project Overview

**PAGAF** (Precision AG for All Farmers) is a free, browser-based precision agriculture platform that runs entirely on GitHub Pages. Farmers select fields on USDA NAIP aerial imagery, draw field boundaries, generate variable-rate prescription maps, and export data to farm equipment (John Deere, Case IH, Trimble, ISO-XML).

- **Live URL:** https://precisionagtech.github.io
- **Repo:** https://github.com/precisionAGTech/precisionagtech.github.io
- **Project Board:** https://github.com/orgs/precisionAGTech/projects/1
- **Powered by:** [nltGIS.ai](https://nltgis.ai)
- **Organization:** precisionAGTech
- **GitHub User:** ghermay

## Architecture

```
THIN CLIENT (GitHub Pages - Static HTML/CSS/JS)
├── index.html              — Product site shell + app layout
├── css/pagaf.css           — All styles (navbar, sidebar, map, modals, panels)
├── js/pagaf.js             — All logic (map, drawing, analysis, export, upload)
├── .github/workflows/ci.yml — CI/CD pipeline
├── CONTEXT.md              — This file (AI reconnection document)
└── README.md               — Project documentation

EXTERNAL CDN LIBRARIES
├── MapLibre GL JS v4.7.1   — Map rendering engine (open source)
├── Turf.js v7              — Client-side spatial analysis (open source)
├── shpjs v4.0.4            — Shapefile reader (open source)
└── shp-write v0.4.2        — Shapefile writer (open source)

EXTERNAL DATA SOURCES (client-side fetch, no backend)
├── NAIP Imagery            — USDA APFO (gis.apfo.usda.gov) — raster tiles
├── Satellite               — Esri World Imagery — raster tiles
├── OpenStreetMap            — OSM raster tiles
├── USGS Topo               — USGS National Map topographic — raster tiles
├── Dark Basemap            — CARTO Dark Matter — vector tiles
├── SSURGO Soils            — USDA NRCS WMS service
├── Cropland Data Layer     — USDA NASS CDL WMS service
├── NWI Wetlands            — FWS Wetlands WMS service
├── Geocoding               — Nominatim (OpenStreetMap) — REST API
└── Map Engine              — MapLibre GL JS v4.7.1 (open source)
```

## Tech Stack

| Component | Technology | Source |
|-----------|-----------|--------|
| Map Engine | MapLibre GL JS 4.7.1 | unpkg CDN (open source) |
| Spatial Analysis | Turf.js 7 | unpkg CDN (open source) |
| Shapefile Read | shpjs 4.0.4 | unpkg CDN (open source) |
| Shapefile Write | shp-write 0.4.2 | unpkg CDN (open source) |
| Default Basemap | USDA NAIP | gis.apfo.usda.gov (free) |
| Satellite | Esri World Imagery | arcgisonline.com (free) |
| Street Map | OpenStreetMap | tile.openstreetmap.org (free) |
| Topo Map | USGS National Map | basemap.nationalmap.gov (free) |
| Dark | CARTO Dark Matter | basemaps.cartocdn.com (free) |
| Soil Data | SSURGO via WMS | sdmdataaccess.sc.egov.usda.gov (free) |
| Crop Data | CDL via WMS | nassgeodata.gmu.edu (free) |
| Geocoding | Nominatim | nominatim.openstreetmap.org (free) |
| Fonts | DM Sans + JetBrains Mono | Google Fonts (free) |
| Hosting | GitHub Pages | precisionagtech.github.io (free) |
| CI/CD | GitHub Actions | .github/workflows/ci.yml |

## Current Feature State (v4.0)

### DONE ✅
- Professional navbar with dropdown menus (Platform, Data Layers, Equipment, Docs)
- Welcome modal with 4-step onboarding (localStorage persistence)
- About modal with version, data sources, credits
- Inline docs panel with getting started, shortcuts, file upload, export info
- Keyboard shortcuts: D=draw, R=rect, M=measure, Esc=cancel, F=zoom, S=sidebar, L=layers, /=search, ?=help, Ctrl+Z/Y=undo/redo, Del=delete field, 1-4=steps
- Undo/redo system for all field operations (30-step history)
- Session persistence — fields saved/restored from localStorage
- Collapsible sidebar with smooth animation
- Floating map toolbar (draw, rect, measure, zoom, undo, layers, fullscreen)
- 5 basemaps: NAIP (USDA), Satellite (Esri), OpenStreetMap, USGS Topo, Dark (CARTO)
- 3 data overlays: SSURGO Soils, Cropland Data Layer, NWI Wetlands (WMS)
- NAIP aerial imagery from USDA as default basemap
- Polygon and rectangle field drawing with live preview line
- Area calculation during drawing (shown in hint bar)
- Perimeter and centroid calculation on field completion
- Field selection — click field on map or in list to select
- Field properties panel — rename, view stats, delete
- Field labels on map (name + acres)
- File upload: GeoJSON, KML, and Shapefile (ZIP) via button or drag & drop
- KML parser (client-side DOM parsing, no external library)
- 6 prescription types: NDVI, Seeding, Fertilizer, Pesticide, Fungicide, Yield
- Prescription grid visualization (color-coded variable rate overlay)
- Real export: GeoJSON download, KML download, CSV download, ISO-XML download
- Shapefile export via shp-write library
- Equipment connector UI: John Deere, Case IH/NH, Trimble/AgLeader, ISO-XML
- Measure tool with distance in miles, feet, kilometers
- Right-click context popup with coordinates, copy, center here
- Toast notifications with icons (success, info, error, warning)
- Status bar with layer, coordinates, zoom, field count, total acres
- Nominatim geocoding with coordinate paste support
- Quick navigation buttons for major ag regions (6 locations)
- URL hash for map position persistence
- Geolocate control (GPS location)
- GitHub Actions CI/CD pipeline (validate, Lighthouse, deploy check)
- Responsive CSS with mobile breakpoints
- OG meta tags, canonical URL, semantic HTML
- Site deployed at root domain (precisionagtech.github.io)

### TODO 📋 (see Issues + Project Board)
- #2: Connect live USDA data layers — improve SSURGO/CDL/weather integration
- #3: Real Shapefile export quality improvements
- #4: Equipment connectors — real ISO-XML task data with zones, John Deere API
- #5: File upload improvements — better error handling, preview before import
- #8: Update README.md to reflect v4.0
- #9: Mobile responsive UX — touch drawing, bottom sheet sidebar
- #10: Real NDVI from Sentinel-2 via Copernicus/SentinelHub

## File Structure Details

### index.html (v4.0)
- SEO meta tags, OG tags, canonical URL
- MapLibre GL JS 4.7.1 (upgraded from 4.1.2)
- shpjs + shp-write CDN scripts for Shapefile support
- Hidden file input for GeoJSON/KML/Shapefile upload
- Data layer panel with SSURGO, CDL, Wetlands checkboxes
- Field properties panel (name input, stats, save/delete)
- Docs panel with getting started, shortcuts, file upload, data sources, export formats
- About modal with version grid and credits
- 5 basemap buttons in navbar layer toggle

### css/pagaf.css (v4.0)
- CSS variables with glass/glass-heavy for backdrop-filter panels
- Data layer panel (.data-layer-panel) styles
- Field properties panel (.field-props-panel) styles
- Docs panel (.docs-panel) with sticky header
- About modal grid (.about-grid, .about-item)
- Improved field list with .field-item.selected state
- Field color dot, zoom button, better layout
- Drag-over state (.main-map.drag-over)
- Toast icons (.toast-icon)
- Context popup styles (.ctx-popup, .ctx-actions)
- Results app header with icon
- Version badge (.brand-version, .modal-version)
- Modal features row (.modal-features, .modal-feature)

### js/pagaf.js (v4.0)
- Session persistence (localStorage save/restore)
- Undo/redo (30-step stack, Ctrl+Z/Y)
- 5 basemaps config (naip, satellite, osm, dark, topo)
- DATA_LAYERS config for WMS overlays
- File upload: GeoJSON, KML (DOM parser), Shapefile (shpjs)
- Drag and drop file handling on map
- KML to GeoJSON converter (kmlToGeoJSON)
- Measure tool with distance display
- Field selection and properties panel
- Real exports: GeoJSON, KML (geoJSONtoKML), CSV (geoJSONtoCSV), ISO-XML (geoJSONtoISOXML)
- Shapefile export via shpwrite library
- Live draw preview line following mouse cursor
- Area display during drawing
- Coordinate paste in search (lat,lng detection)
- URL hash for position persistence

## Design Decisions

1. **Thin client only** — No backend, no server, no database. Everything runs client-side on GitHub Pages.
2. **Free and open source tools only** — MapLibre (not Mapbox), Turf.js, shpjs, shp-write. All MIT licensed.
3. **Free public data only** — USDA NAIP, SSURGO, CDL, OSM, USGS, Esri (free tier). No API keys needed.
4. **NAIP as default** — USDA aerial imagery is the best free source for US farmland at field-level resolution.
5. **nltGIS.ai design language** — Dark theme, glass-morphism panels, DM Sans typography, green accents.
6. **Tool-first UX** — The app IS the site. No marketing pages, no scroll. Immediate access to tools.
7. **Equipment export priority** — The end goal is getting data into John Deere, Case IH, Trimble tractors.
8. **OGC compliance** — All exports use open standards (GeoJSON, KML, Shapefile, ISO-XML).
9. **Session persistence** — Fields survive page reload via localStorage.
10. **Undo/redo** — Non-destructive workflow, can recover deleted fields.

## How to Continue Development

1. Read this CONTEXT.md file
2. Check the Project Board: https://github.com/orgs/precisionAGTech/projects/1
3. Pick the next issue from the board
4. Edit files directly on GitHub (no local dev needed)
5. Commit to main branch — GitHub Pages auto-deploys
6. CI/CD pipeline runs automatically (.github/workflows/ci.yml)
7. Update this CONTEXT.md after significant changes

## Related Projects

- **nltGIS.ai** — AI-Native Spatial Intelligence platform (design reference)
- **pagaf.nltmso.com** — Original PAGAF site (migrated from)
