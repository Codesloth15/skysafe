# SkySafe

**Know Before You Fly.** A frontend-only Philippine airspace explorer built with React, TypeScript, Vite, React Leaflet, Turf, Tailwind, TanStack Query, Zustand and Zod.

No backend, database, account, authentication, or paid API is required. The earlier full-stack scaffolding has been replaced by this standalone app.

## Run on this workstation

Use Node.js 22.12+ (Node 24 is installed here). In PowerShell:

```powershell
cd F:\airsafe
npm.cmd install
npm.cmd run dev
```

Open **http://localhost:5173**. On Windows, `npm.cmd` avoids PowerShell's restriction on the `npm.ps1` launcher. On other systems use `npm`.

The real Philippine airport snapshot is included in `public/data/airports.json`; the browser never downloads the worldwide CSV. Refresh it explicitly before publishing:

```powershell
npm.cmd run prepare:airports
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

The preparation script parses quoted CSV values, filters PH records, validates and deduplicates airports, records source timestamps, and atomically replaces the snapshot only after a successful import. Failed downloads leave existing data intact and exit with failure. Builds use the included snapshot and do not require provider access.

## What works

- Philippine street map, clustered airport and heliport markers, popups, click-to-inspect and fly-to search.
- Debounced city, municipality, province and airport search; direct latitude, longitude input; recent searches.
- Turf geodesic airport distances and configurable 3/5/10 km proximity rings. Rings appear from zoom level 8, with up to 100 rendered at a time; all loaded airports are still considered in assessments.
- Local-area Overpass supplements via **Load nearby OSM**, from zoom level 10. Requests cover a 0.3° square around the center, are cached, and enforce a 30-second cooldown. Provider failures leave prepared airport data available.
- Verified GeoJSON Polygon/MultiPolygon support, overlapping restrictions, effective dates, provenance and altitude notices.
- Military installations, police stations, and prisons loaded through **Load nearby OSM**, with a toggleable map layer, source popups, and nearby establishment warnings. These reference points do not establish legal no-fly boundaries.
- Interactive **Plan flight** mode: use geolocation or a map start, add and drag up to 30 waypoints, undo/remove points, fit the route, and include a return leg. A custom FPV icon previews the flight along a highlighted route. Plans remain in memory during this session.
- Planning rejects starts and route edits inside or across verified prohibited/restricted zones, including return legs and new connections created by deleting a waypoint. Departure, wind, and airspace updates revalidate existing drafts and disable preview on conflicts. Hiding a layer cannot bypass checks. Loading/failed airspace data blocks new routes; an empty successfully loaded dataset still means incomplete coverage, not flight clearance.
- DJI FPV profile with Normal/Sport/Manual speed limits, departure in Philippine time, time budget, cruise assumption, reserve, and takeoff/landing/hover allowance. Forecast or manual wind changes route-time estimates. Cyan marks the portion within the time budget, amber the excess, and red wind issues or verified airspace intersections. These are estimates, not flight clearance or an executable DJI mission.
- Favorites with rename/delete; persisted layer, theme, base-map and radius preferences; light/dark themes and mobile bottom sheet.
- Geolocation, fullscreen, source metadata, skeletons and explicit provider/data error states.

## Safety and data limits

**SkySafe does not grant flight permission.** Official national regulatory coverage and live NOTAMs are incomplete. An empty restriction collection, an empty airport list, a failed request, or distance from an airport never produces a safe-to-fly result. The initial classification remains `UNKNOWN`; airport proximity is a separate visual advisory. Nearby records are listed within 25 km, including reference records marked closed where present. Verify the airport's actual operating status.

The included `restricted-zones.geojson` is an empty FeatureCollection, deliberately containing no invented boundaries. See [data sources and import format](docs/data-sources.md) before importing authorized official data. Altitude and operating conditions must be checked with the source publication; the MVP does not calculate vertical flight clearance. Philippine support is approximated by a bounding box, not a sovereign-boundary dataset; locations elsewhere are explicitly unsupported.

Airport freshness is flagged after 7 days; zone verification after 28 days. These are product freshness indicators, not regulatory validity rules. Effective/expiration dates are evaluated separately and re-evaluated every minute while the app is open.

## Optional configuration

Copy `.env.example` to `.env.local` only if changing providers. Satellite mode is disabled unless both a licensed tile URL and its attribution are configured. No credentials are required for the default public services.

Photon is a public demo service for modest traffic, without an availability guarantee. The app debounces search and caches results; switch to a suitable instance before higher-volume public deployment. OSM map tiles must not be bulk-downloaded. See [provider policies](docs/data-sources.md). All browser environment values are public: never add secrets to VITE variables.

## Verification

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Unit and component tests use synthetic fixtures only. Browser tests use the included real airport snapshot, run desktop and Pixel 7 layouts, and verify coordinate search, conservative assessments, favorites, persisted settings, missing datasets, and no JavaScript errors. External geocoder responses are mocked in tests. Browser screenshots are generated under `test-results/`.

## Deploy to Vercel

Import this directory as a Vite project. Build command: `npm run build`. Output: `dist`. The included `vercel.json` supports direct navigation to client routes. No deployment has been published automatically. Refresh and review your data snapshot before deployment and ensure provider usage remains appropriate.

See [architecture](docs/architecture.md) for layer boundaries and design decisions.

See [next feature: live drone GPS tracking](NEXT_FEATURE.md) for the proposed integration, DJI FPV compatibility limits, and implementation acceptance criteria.

### Landing and workspace

The main URL (`/`) opens the public landing page. Select **Open Airspace Map** to enter the drone planning workspace at `/explore`. The location checker, saved locations, settings, and data information remain available in the workspace.
