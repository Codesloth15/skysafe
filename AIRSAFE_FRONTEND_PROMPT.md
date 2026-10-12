# AirSafe — Frontend Development Master Prompt

## Role
Act as a Senior React.js Developer, Frontend Software Architect, GIS Engineer, and UI/UX Designer. Build **AirSafe**, a responsive drone airspace explorer for the Philippines. Follow Clean Architecture, SOLID, separation of concerns, DRY, KISS, dependency inversion, repository pattern, strict TypeScript, accessibility, and testing. Build a functional app, not a static mockup.

## 1. Overview
**Project:** AirSafe  
**Tagline:** Know Before You Fly.  
**Platform:** Frontend-only web app  
**Coverage:** Philippines

Users can explore airports and heliports, search locations, select a point on a map, calculate nearby airport distances, view proximity advisory circles, toggle layers, and inspect verified airspace restrictions when authoritative data is available. **Never label a location legally safe to fly based only on missing restrictions.**

## 2. Technology Stack
- React.js, TypeScript (strict), Vite
- Tailwind CSS, React Router
- React Leaflet, Leaflet, Turf.js
- TanStack Query, Zustand, Zod
- Lucide React, Sonner
- Vitest, React Testing Library

Use current compatible stable versions and avoid unnecessary dependencies. **No Express backend, Supabase, database, authentication, or paid APIs in the MVP.**

## 3. Clean Architecture
**Domain:** Airport, Heliport, AirspaceZone, GeographicLocation, AirspaceAssessment, DataSource; domain services and repository contracts. No React, Leaflet, or HTTP dependencies.

**Application:** GetPhilippineAirports, GetNearbyAirports, CalculateAirportDistance, CheckFlightLocation, GetAirspaceZones, SearchLocation. Depend on abstractions.

**Infrastructure:** OurAirports adapter, OpenStreetMap Overpass adapter, GeoJSON restriction adapter, HTTP client, data validation, caching.

**Presentation:** React pages, layouts, map components, hooks, view models, UI state, loading and error states. Keep business logic outside React components.

### Folder structure
```text
airsafe/
├── public/data/
│   ├── airports.json
│   └── restricted-zones.geojson
├── src/
│   ├── app/{providers,router,store}/
│   ├── domain/{entities,enums,repositories,services}/
│   ├── application/{use-cases,dto}/
│   ├── infrastructure/{api,repositories,adapters,cache}/
│   ├── presentation/
│   │   ├── components/{common,layout,map,airspace}/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── view-models/
│   ├── shared/{constants,types,utils}/
│   ├── styles/
│   └── main.tsx
├── scripts/prepare-airports.mjs
├── tests/
├── .env.example
├── package.json
└── README.md
```
Keep folders practical; do not create needless abstractions.

## 4. Free Data Sources
### OurAirports
Source: https://ourairports.com/data/  
CSV: https://davidmegginson.github.io/ourairports-data/airports.csv

Build a **build-time preparation script** that downloads the CSV, parses quoted values correctly, filters `iso_country === "PH"`, validates coordinates, normalizes airports, and writes `public/data/airports.json` with source attribution and import timestamp. Handle failures without silently overwriting valid data with empty results. Do not download the worldwide CSV on every app visit.

```typescript
interface Airport {
  id: string;
  name: string;
  icaoCode?: string;
  iataCode?: string;
  type: string;
  latitude: number;
  longitude: number;
  source: string;
}
```

### OpenStreetMap Overpass
Endpoint: https://overpass-api.de/api/interpreter

Example query:
```overpass
[out:json][timeout:60];
area["ISO3166-1"="PH"][admin_level=2]->.ph;
(
  nwr["aeroway"="aerodrome"](area.ph);
  nwr["aeroway"="heliport"](area.ph);
);
out center;
```

Query only necessary areas, debounce and cache requests, respect public server limits, handle errors, normalize results, and deduplicate against OurAirports. Avoid repeated nationwide queries. If browser CORS or usage rules prevent direct access, use prepared static data rather than unauthorized proxies.

### Official restrictions
Support future import of **verified, licensed CAAP aviation information**, without assuming a free CAAP REST API. Airport reference datasets are **not** authoritative no-fly-zone datasets. Never fabricate prohibited-area polygons.

## 5. Interactive Map
Use React Leaflet. Default center: `[12.8797, 121.7740]`, zoom `6`.

Implement street map, optional licensed satellite layer, airport and heliport markers, verified airspace polygons, airport proximity advisory circles, current-location permission flow, coordinate search, zoom/pan, layer toggles, fullscreen, responsive panels, and a map legend. Optimize marker rendering.

Layers: airports, heliports, airport proximity advisories, verified prohibited zones, verified restricted zones, controlled airspace, advisory areas. Mark unavailable layers clearly.

## 6. Airspace Status
```typescript
enum AirspaceStatus {
  PROHIBITED = "PROHIBITED",
  RESTRICTED = "RESTRICTED",
  CONTROLLED = "CONTROLLED",
  AIRPORT_ADVISORY = "AIRPORT_ADVISORY",
  NO_KNOWN_RESTRICTION = "NO_KNOWN_RESTRICTION",
  UNKNOWN = "UNKNOWN"
}
```

Colors: prohibited red, restricted orange, controlled purple, advisory yellow, no-known-restriction green **only when sufficiently supported by complete verified datasets**, unknown gray. In the MVP, classify areas lacking verified restriction data as `UNKNOWN`, not green.

## 7. Airport Proximity Advisories
Use Turf.js to generate configurable **3 km, 5 km, and 10 km visual advisory circles** and calculate accurate geodesic distances. These are **not official legal no-fly boundaries**. On selection, show airport name, type, distance, radius, source, and verified regulatory references if available.

## 8. Flight Location Checker
On map click:
1. Capture and validate latitude/longitude.
2. Find nearby airports and calculate distances.
3. Load available verified airspace polygons.
4. Check point-in-polygon and overlapping restrictions.
5. Evaluate effective dates and altitude applicability where documented.
6. Check source freshness and coverage completeness.
7. Show a result panel or mobile bottom sheet.

Example UI: **Assessment: Not Yet Verified**; **Official Airspace Coverage: Incomplete**; message: “This location has not been confirmed as unrestricted. Review official CAAP information before flight.” Do not fabricate nearby airport results for sample coordinates.

## 9. Search
Support city, municipality, province, airport, and latitude/longitude. Use a geocoding service only in compliance with its public-use policies. Implement debouncing, suggestions, loading and empty states, validation, fly-to animation, and locally saved recent searches. Do not confuse map tile servers with geocoding APIs.

## 10. GeoJSON Restrictions
Prepare `public/data/restricted-zones.geojson` for **verified** GeoJSON FeatureCollections. Each feature should carry ID, name, category, authority, description, geometry, altitude applicability, effective dates, source reference, and verification status. Validate before rendering and checking intersections. If no verified data is loaded, display **“Official restricted airspace data is not yet available.”** Label demo geometry prominently and never pass it off as real.

## 11. UI/UX
Aviation-inspired, map-first, accessible, responsive interface.

Palette:
```text
Primary Navy   #0B132B
Aviation Blue  #2563EB
Sky Blue       #38BDF8
Background     #F8FAFC
Surface        #FFFFFF
Primary Text   #0F172A
Secondary Text #64748B
Danger         #EF4444
Warning        #F59E0B
```

**Desktop:** Sidebar (Explore Map, Location Checker, Saved Locations, About, Settings); top bar (search, data freshness, geolocation, theme); main map (markers, overlays, controls, legend); right panel (selected location, nearby airports, distances, assessment, sources, disclaimer).

**Mobile:** Full-screen map, compact search, floating controls, bottom navigation, bottom-sheet details, collapsible legend, safe-area padding, accessible touch targets. Support light/dark mode, subtle animation, skeletons, and error states.

## 12. Local Storage
No database. Use LocalStorage for favorite locations, recent searches, map layer preferences, and theme. Validate persisted data before reading; avoid sensitive information.

## 13. Performance and SOLID
Implement lazy routes, efficient markers, memoization when useful, debounced search, TanStack Query caching, request cancellation, GeoJSON validation, and graceful API failures.

Apply all SOLID principles: focused responsibilities; extensible providers/layers; substitutable repositories; narrow interfaces; use cases depending on abstractions. Avoid overengineering.

## 14. Testing
Use Vitest and React Testing Library. Test CSV normalization and PH filtering, coordinate validation, geodesic distances, advisory radius detection, GeoJSON parsing, polygon intersection, missing datasets, stale data, layer state, search, and error handling. Verify unavailable data never produces a false “safe to fly” result.

## 15. Development Phases
1. **Foundation:** Vite, React, TS, Tailwind, Clean Architecture, routing, query/state, testing.
2. **UI:** Responsive shell, sidebar, navigation, search, controls, themes.
3. **Map:** React Leaflet, Philippines view, click selection, geolocation, layers.
4. **Airport data:** OurAirports build script, real markers, popups, supplementary OSM, caching and deduplication.
5. **Location checker:** Turf.js distances, configurable circles, nearby airports, assessment, unknown-data warnings.
6. **Airspace:** Verified GeoJSON support, polygons, intersection checks, attribution and freshness.
7. **Polish:** Performance, accessibility, mobile, loading/error states, tests, build, Vercel deployment.

## 16. Non-negotiable Rules
- Frontend only: no Express, Supabase, database, authentication, or paid APIs.
- Use real airport data when available; do not invent official restrictions.
- Never infer flight legality from absence of mapped restrictions.
- Keep business logic outside React; use strict TypeScript and SOLID.
- Respect source licensing, attribution, CORS, and rate limits.
- Provide functional UI, robust states, and tests.

## 17. Expected MVP
A user opens AirSafe, sees the Philippine map and real airport markers, searches or clicks a location, sees nearest airports and distances, toggles advisory circles, and receives a clear, source-aware airspace assessment. The application works on desktop and mobile, requires no backend, and deploys to Vercel.

## 18. Start Implementation
Initialize Vite React TypeScript, install dependencies, create the architecture, build the responsive shell, integrate Leaflet, prepare and load OurAirports data, show real Philippine airport markers, and implement the Turf.js location checker. Work phase by phase, run TypeScript checks, tests, and a production build, and fix failures before moving on. **Do not stop at scaffolding; deliver a functional map and checker.**
