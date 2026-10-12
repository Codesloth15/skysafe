import type {
  IAirportRepository,
  IAirspaceRepository,
  IGeocodingRepository,
} from '../../domain/repositories';
import type {
  Airport,
  GeographicLocation,
  SearchResult,
  AirspaceDataset,
} from '../../domain/entities';
import {
  airportDistance,
  coordinatesSchema,
} from '../../domain/services/geography';
import {
  assessLocation,
  nearbyAirports,
} from '../../domain/services/assessment';
export class GetPhilippineAirports {
  constructor(private repository: IAirportRepository) {}
  execute(signal?: AbortSignal) {
    return this.repository.getAll(signal);
  }
}
export class GetAirspaceZones {
  constructor(private repository: IAirspaceRepository) {}
  execute(signal?: AbortSignal) {
    return this.repository.getZones(signal);
  }
}
export class GetNearbyAirports {
  execute(location: GeographicLocation, airports: Airport[], radius = 5) {
    return nearbyAirports(location, airports, radius);
  }
}
export class CalculateAirportDistance {
  execute(a: GeographicLocation, b: GeographicLocation) {
    return airportDistance(a, b);
  }
}
export class CheckFlightLocation {
  execute(
    location: GeographicLocation,
    airports: Airport[],
    zones: AirspaceDataset,
    radius = 5,
    now = Date.now(),
  ) {
    return assessLocation(location, airports, zones, radius, now);
  }
}
export const looksLikeCoordinates = (query: string) =>
  /^[\s+\-\d.eE]*,/.test(query);
export function localSearch(
  query: string,
  airports: Airport[],
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (looksLikeCoordinates(q)) {
    const parts = q.split(',');
    if (parts.length !== 2 || parts.some((p) => !p.trim())) return [];
    const parsed = coordinatesSchema.safeParse({
      latitude: Number(parts[0]),
      longitude: Number(parts[1]),
    });
    return parsed.success
      ? [
          {
            ...parsed.data,
            id: 'coordinates-' + q,
            name: 'Selected coordinates',
            detail: parsed.data.latitude + ', ' + parsed.data.longitude,
            kind: 'coordinates',
          },
        ]
      : [];
  }
  return airports
    .filter((a) =>
      (a.name + ' ' + (a.icaoCode ?? '') + ' ' + (a.iataCode ?? ''))
        .toLowerCase()
        .includes(q),
    )
    .slice(0, 7)
    .map((a) => ({
      ...a,
      kind: 'airport',
      detail: (a.icaoCode ?? a.iataCode ?? a.type) + ' · ' + a.source,
    }));
}
export class SearchLocation {
  constructor(private repository: IGeocodingRepository) {}
  async execute(query: string, airports: Airport[], signal?: AbortSignal) {
    const local = localSearch(query, airports);
    if (looksLikeCoordinates(query) || query.trim().length < 3)
      return { results: local, warning: null };
    try {
      const remote = await this.repository.search(query, signal);
      return { results: [...local, ...remote].slice(0, 10), warning: null };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        results: local,
        warning:
          'Place search is unavailable. You can still search airports or enter coordinates.',
      };
    }
  }
}
