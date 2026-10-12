import { z } from 'zod';
import type { IGeocodingRepository } from '../../domain/repositories';
import type { SearchResult } from '../../domain/entities';
import { request } from '../api/http';
import { readStored, writeStored } from '../cache/storage';
const responseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([
          z.number().min(-180).max(180),
          z.number().min(-90).max(90),
        ]),
      }),
      properties: z.object({
        osm_id: z.number().optional(),
        name: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        countrycode: z.string().optional(),
        type: z.string().optional(),
      }),
    }),
  ),
});
const cachedSchema = z
  .object({
    at: z.number(),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        detail: z.string(),
        kind: z.literal('place'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    ),
  })
  .nullable();
export class PhotonGeocodingRepository implements IGeocodingRepository {
  private lastRequest = 0;
  async search(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
    const key = 'search:' + query.trim().toLowerCase();
    const cached = readStored(key, cachedSchema, null);
    if (cached && Date.now() - cached.at < 7 * 86400000) return cached.items;
    const delay = Math.max(0, 1200 - (Date.now() - this.lastRequest));
    if (delay)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', abort);
          resolve();
        }, delay);
        const abort = () => {
          clearTimeout(timer);
          reject(new DOMException('Cancelled', 'AbortError'));
        };
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
    this.lastRequest = Date.now();
    const url = new URL(
      import.meta.env.VITE_GEOCODER_URL || 'https://photon.komoot.io/api/',
    );
    url.search = new URLSearchParams({
      q: query,
      limit: '8',
      lang: 'en',
      bbox: '116,4,127,22',
    }).toString();
    const data = responseSchema.parse(
      await request(url.toString(), { signal }),
    );
    const items = data.features
      .filter((f) => f.properties.countrycode?.toUpperCase() === 'PH')
      .map((f, i): SearchResult => ({
        id:
          'photon-' +
          (f.properties.osm_id ?? i) +
          '-' +
          f.geometry.coordinates.join(','),
        name:
          f.properties.name ??
          f.properties.city ??
          f.properties.state ??
          'Unnamed place',
        detail: [f.properties.city, f.properties.state, f.properties.country]
          .filter(Boolean)
          .join(', '),
        kind: 'place',
        longitude: f.geometry.coordinates[0],
        latitude: f.geometry.coordinates[1],
      }));
    writeStored(key, { at: Date.now(), items });
    return items;
  }
}
