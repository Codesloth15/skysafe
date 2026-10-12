import { z } from 'zod';
import type { ISupplementaryAirportRepository } from '../../domain/repositories';
import type { Airport, MapBounds } from '../../domain/entities';
import { normalizeOverpass, airportSchema } from '../adapters/airports';
import { readStored, writeStored } from '../cache/storage';
import { request } from '../api/http';
const cacheSchema = z
  .object({ at: z.number(), airports: z.array(airportSchema) })
  .nullable();
export class OverpassAirportRepository implements ISupplementaryAirportRepository {
  private lastRequest = 0;
  private pending = false;
  async getArea(bounds: MapBounds, signal?: AbortSignal): Promise<Airport[]> {
    const { south, west, north, east } = bounds;
    if (
      ![south, west, north, east].every(Number.isFinite) ||
      north <= south ||
      east <= west ||
      north - south > 1 ||
      east - west > 1 ||
      south < 4 ||
      north > 22 ||
      west < 116 ||
      east > 127
    )
      throw new Error(
        'Zoom in on a Philippine area before loading nearby OSM features.',
      );
    const key =
      'osm:' +
      Object.values(bounds)
        .map((v) => v.toFixed(2))
        .join(':');
    const cache = readStored(key, cacheSchema, null);
    if (cache && Date.now() - cache.at < 86400000) return cache.airports;
    const globalLast = readStored('osm-last-request', z.number(), 0);
    if (
      this.pending ||
      Date.now() - Math.max(globalLast, this.lastRequest) < 30000
    )
      throw new Error('Please wait 30 seconds between OSM area requests.');
    this.lastRequest = Date.now();
    writeStored('osm-last-request', this.lastRequest);
    this.pending = true;
    try {
      const query =
        '[out:json][timeout:25];(nwr["aeroway"="aerodrome"](' +
        [south, west, north, east].join(',') +
        ');nwr["aeroway"="heliport"](' +
        [south, west, north, east].join(',') +
        '););out center;';
      const data = await request(
        import.meta.env.VITE_OVERPASS_URL ||
          'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
          signal,
        },
        30000,
      );
      const airports = normalizeOverpass(data);
      writeStored(key, { at: Date.now(), airports });
      return airports;
    } catch (error) {
      if (cache && !signal?.aborted) return cache.airports;
      throw error;
    } finally {
      this.pending = false;
    }
  }
}
