import { z } from 'zod';
import { feature, kinks, area, booleanValid } from '@turf/turf';
import {
  AirspaceStatus,
  type AirspaceDataset,
  type AirspaceZone,
} from '../../domain/entities';
const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const ring = z
  .array(position)
  .min(4)
  .refine(
    (r) => r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1],
    'Polygon rings must be closed',
  );
const polygon = z.array(ring).min(1);
const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygon }),
  z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(polygon).min(1),
  }),
]);
const date = z.string().datetime({ offset: true });
const properties = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum([
      AirspaceStatus.PROHIBITED,
      AirspaceStatus.RESTRICTED,
      AirspaceStatus.CONTROLLED,
      AirspaceStatus.AIRPORT_ADVISORY,
    ]),
    authority: z.string().min(1),
    description: z.string(),
    sourceUrl: z
      .string()
      .url()
      .refine((v) => /^https?:\/\//.test(v)),
    publicationDate: date,
    effectiveFrom: date,
    effectiveUntil: date.nullable(),
    lowerAltitude: z.number().finite().nullable(),
    upperAltitude: z.number().finite().nullable(),
    altitudeReference: z.enum(['AGL', 'AMSL', 'FL', 'UNKNOWN']),
    verificationStatus: z.enum(['verified', 'unverified']),
    verifiedAt: date,
  })
  .refine(
    (v) =>
      !v.effectiveUntil ||
      Date.parse(v.effectiveUntil) > Date.parse(v.effectiveFrom),
    'Expiration must follow effective date',
  )
  .refine(
    (v) =>
      v.lowerAltitude === null ||
      v.upperAltitude === null ||
      v.lowerAltitude <= v.upperAltitude,
    'Invalid altitude range',
  );
const collection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({ type: z.literal('Feature'), geometry, properties }),
  ),
});
export function parseAirspaceGeoJSON(input: unknown): AirspaceDataset {
  const parsed = collection.parse(input);
  const zones: AirspaceZone[] = parsed.features.map((f) => {
    if (kinks(feature(f.geometry)).features.length)
      throw new Error('Self-intersecting airspace geometry');
    if (!booleanValid(feature(f.geometry)) || area(feature(f.geometry)) <= 0)
      throw new Error('Invalid or degenerate airspace geometry');
    return { ...f.properties, geometry: f.geometry };
  });
  const verified = zones.filter((z) => z.verificationStatus === 'verified');
  return {
    zones,
    coverageComplete: false,
    source: {
      name: 'CAAP AIS · authorized imports',
      url: 'https://ais.caap.gov.ph/',
      attribution: 'Source and authority attached to each imported feature.',
      importedAt:
        verified
          .map((z) => z.verifiedAt)
          .sort()
          .at(-1) ?? null,
      status: verified.length ? 'available' : 'missing',
      message: verified.length
        ? 'Imported zones are available. National coverage and live NOTAMs remain incomplete.'
        : 'Official restricted airspace data is not yet available.',
    },
  };
}
export const emptyAirspace = () =>
  parseAirspaceGeoJSON({ type: 'FeatureCollection', features: [] });
