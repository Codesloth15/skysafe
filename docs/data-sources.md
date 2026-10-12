# Data sources and usage

## OurAirports

[Data page](https://ourairports.com/data/) · [CSV](https://davidmegginson.github.io/ourairports-data/airports.csv) · [upstream repository](https://github.com/davidmegginson/ourairports-data)

The preparation script imports PH records with valid coordinates, parses quoted CSV correctly, normalizes codes and attaches source references and timestamps. Airport locations are reference data, not official drone airspace boundaries. OurAirports describes its airport data as public domain; retain attribution for transparency. Reference records can include closed facilities. Inspect the source record and official information before use.

`public/data/osm-airports.json` can contain an optional prepared supplement with `{ importedAt, airports }` using the normalized Airport schema. The current supplement is empty because the earlier Overpass import did not provide usable supplemental records. No records have been invented.

## OpenStreetMap and Overpass

[Copyright / ODbL](https://www.openstreetmap.org/copyright) · [Overpass public instances](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances) · [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)

Street tiles use the documented OSM tile endpoint with visible attribution and normal browser caching. No tile prefetch, offline cache, scraping or bulk download is implemented. Browser Referer is retained by the deployment's referrer policy. Configure another permitted tile service for larger traffic.

Overpass is requested only when the user presses Load nearby OSM at zoom 10+. A 0.3° bounding square limits requests; a 30-second application cooldown and one-day per-area cache reduce load. Requests time out after 30 seconds, validate response shapes, preserve prepared airport data on failure and deduplicate by IDs/codes/proximity. No unauthorized CORS proxy is used.

## Photon search

[Official repository and public demo terms](https://github.com/komoot/photon#demo-server) · [API documentation](https://github.com/komoot/photon/blob/master/docs/api-v1.md)

Photon supports search-as-you-type and permits reasonable public demo usage, but extensive traffic can be throttled or banned and availability is not guaranteed. Search uses a 650 ms debounce, at least three characters, a minimum 1.2 s interval between requests, cancellation, query caching and a Philippine bounding filter. Local airport and coordinate results remain available on failure. Photon responses are filtered to country code PH. Queries are sent to this provider; no geolocation is sent to search automatically.

Use the configured endpoint to select a suitably provisioned Photon-compatible service before scaling. This app does not call public Nominatim autocomplete or use map tiles as a geocoding API.

## CAAP official regulatory information

[CAAP Aeronautical Information Service](https://ais.caap.gov.ph/) provides official aviation publications and access/subscription information. No public free REST API or redistribution license is assumed. This MVP has no authorized national boundary feed or live NOTAM connection. **Official restricted airspace data is not yet available.**

Only import a dataset you are authorized to use and whose geometry and metadata have been verified against the official publication. Do not redraw guessed airport circles as official restrictions. Add authorized data to `public/data/restricted-zones.geojson`, then test and rebuild.

Expected shape:

```typescript
{
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Polygon' | 'MultiPolygon', coordinates: /* GeoJSON [longitude, latitude] rings */ },
    properties: {
      id: string, name: string,
      category: 'PROHIBITED' | 'RESTRICTED' | 'CONTROLLED' | 'AIRPORT_ADVISORY',
      authority: string, description: string, sourceUrl: string,
      publicationDate: string, // ISO timestamp with offset
      effectiveFrom: string, effectiveUntil: string | null,
      lowerAltitude: number | null, upperAltitude: number | null,
      altitudeReference: 'AGL' | 'AMSL' | 'FL' | 'UNKNOWN',
      verificationStatus: 'verified' | 'unverified',
      verifiedAt: string // ISO timestamp with offset
    }
  }]
}
```

Coordinates must be finite and in range; polygon rings must be closed, non-self-intersecting and contain at least four positions. Imported features without required provenance, dates or altitude metadata are rejected. Unverified/future/expired zones are not rendered as active regulatory layers. The assessment separately warns about expired intersecting records and stale verification. Flight levels are labeled as flight levels, not meters. Altitude applicability is conservatively left for manual source verification.

The geometry validator checks structure and self-intersection; source review must also verify topology, polygon holes, vertical references, licensing and the geographic accuracy of the publication. Partial imports never set coverage complete.
