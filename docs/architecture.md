# Architecture

This is a standalone Vite application. There is no Express server, Supabase dependency, or authentication path.

- **Domain**: typed entities, repository contracts, coordinate validation, distance/proximity calculations, deduplication, source freshness and conservative assessments. No React, Leaflet, HTTP client or storage access.
- **Application**: named use cases depend on repository contracts. Search combines local airport/coordinate matches with a replaceable geocoding repository. Flight checks accept loaded datasets rather than fetching on every map click.
- **Infrastructure**: static data repositories, Photon and Overpass adapters, fetch cancellation/timeouts, Zod response validation, and validated localStorage. GeoJSON imports require provenance and valid dates, rings and geometry.
- **Presentation**: route pages, responsive layout, map layers and controls, search, assessment and source display. Query hooks orchestrate loading and cancellation. Zustand stores view selection and validated browser preferences; computed safety assessments are never persisted as permission.

Composition lives in `src/app/services.ts`. New geocoders or airspace data repositories can implement the existing focused contracts. Presentation can be tested by injecting QueryClient fixtures; domain services are independently testable.

## Deliberate decisions

Airport imports happen before deployment, avoiding CORS failures and repeated global CSV downloads. A checked-in static snapshot makes the default app immediately useful. Live Overpass supplements are explicit, spatially limited, cooled down and cached; ordinary map movement does not make provider requests.

Regulatory completeness is always false in this MVP. There is no code path to NO_KNOWN_RESTRICTION without a future, audited completeness model. A positive mapped restriction may be shown, but absence never implies authorization. Airport rings are calculated by Turf and shown independently of legal classification.

Closed airfields remain reference records with gray markers. The interface does not claim every airport record is operational. Airport and heliport layers have distinct symbols. To limit vector rendering cost, proximity rings are visible only when zoomed in and capped at 100; assessment calculations continue to use all loaded facilities.

Local storage contains favorites, recent searches, provider cache snapshots and UI preferences. Every read validates its shape. Corrupt or unavailable storage falls back safely; writes can remain session-only with an explicit UI notice. There are no personal accounts, drone serial numbers or private API credentials.

Browser-native fetch is sufficient; Axios, React Hook Form, Recharts and server libraries were removed because this scope does not need them. Routes are lazy-loaded and the map uses canvas for vectors and viewport filtering for marker rendering.
