import { z } from 'zod';
import type { Airport, AirportDataset } from '../../domain/entities';
import {
  coordinatesSchema,
  deduplicateAirports,
} from '../../domain/services/geography';
const link = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//.test(v), 'HTTP URL required');
export const airportSchema = coordinatesSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  icaoCode: z.string().optional(),
  iataCode: z.string().optional(),
  type: z.string().min(1),
  source: z.string().min(1),
  sourceReference: link,
  updatedAt: z.string().datetime({ offset: true }),
});
export const sourceSchema = z.object({
  name: z.string(),
  url: link,
  attribution: z.string(),
  importedAt: z.string().datetime({ offset: true }).nullable(),
  status: z.enum(['available', 'missing', 'stale', 'error']),
  message: z.string(),
});
export const airportDatasetSchema = z.object({
  airports: z.array(airportSchema).min(1),
  sources: z.array(sourceSchema).min(1),
  importedAt: z.string().datetime({ offset: true }),
});
export function validateAirportDataset(input: unknown): AirportDataset {
  const data = airportDatasetSchema.parse(input);
  return { ...data, airports: deduplicateAirports(data.airports) };
}
const csvRow = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string(),
  iso_country: z.literal('PH'),
  latitude_deg: z
    .string()
    .min(1)
    .transform(Number)
    .pipe(z.number().finite().min(-90).max(90)),
  longitude_deg: z
    .string()
    .min(1)
    .transform(Number)
    .pipe(z.number().finite().min(-180).max(180)),
  ident: z.string(),
  icao_code: z.string().optional(),
  iata_code: z.string().optional(),
});
export function normalizeOurAirports(
  rows: unknown[],
  updatedAt: string,
): Airport[] {
  return deduplicateAirports(
    rows.flatMap((row) => {
      const parsed = csvRow.safeParse(row);
      if (!parsed.success) return [];
      const r = parsed.data;
      return [
        {
          id: 'oa-' + r.id,
          name: r.name,
          type: r.type,
          latitude: r.latitude_deg,
          longitude: r.longitude_deg,
          icaoCode:
            r.icao_code || (/^[A-Z]{4}$/.test(r.ident) ? r.ident : undefined),
          iataCode: r.iata_code || undefined,
          source: 'OurAirports',
          sourceReference:
            'https://ourairports.com/airports/' +
            encodeURIComponent(r.ident) +
            '/',
          updatedAt,
        },
      ];
    }),
  );
}
const osmSchema = z.object({
  elements: z.array(
    z.object({
      id: z.number(),
      type: z.enum(['node', 'way', 'relation']),
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: z.object({ lat: z.number(), lon: z.number() }).optional(),
      tags: z.record(z.string()).optional(),
    }),
  ),
});
export function normalizeOverpass(
  input: unknown,
  at = new Date().toISOString(),
): Airport[] {
  return deduplicateAirports(
    osmSchema.parse(input).elements.flatMap((e) => {
      const p = coordinatesSchema.safeParse({
        latitude: e.lat ?? e.center?.lat,
        longitude: e.lon ?? e.center?.lon,
      });
      if (!p.success) return [];
      return [
        {
          ...p.data,
          id: 'osm-' + e.type + '-' + e.id,
          name: e.tags?.name ?? 'Unnamed ' + (e.tags?.aeroway ?? 'aerodrome'),
          type: e.tags?.aeroway === 'heliport' ? 'heliport' : 'small_airport',
          icaoCode: e.tags?.icao,
          iataCode: e.tags?.iata,
          source: 'OpenStreetMap contributors',
          sourceReference:
            'https://www.openstreetmap.org/' + e.type + '/' + e.id,
          updatedAt: at,
        },
      ];
    }),
  );
}
