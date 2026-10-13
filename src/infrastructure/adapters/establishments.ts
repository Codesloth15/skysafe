import { z } from 'zod';
import type { SensitiveEstablishment } from '../../domain/entities';
import {
  coordinatesSchema,
  isSupportedLocation,
} from '../../domain/services/geography';
import { osmSchema } from './airports';

export const establishmentSchema = coordinatesSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['military', 'police', 'prison']),
  sourceReference: z
    .string()
    .url()
    .startsWith('https://www.openstreetmap.org/'),
  updatedAt: z.string().datetime({ offset: true }),
});

export function normalizeEstablishments(
  input: unknown,
  at = new Date().toISOString(),
): SensitiveEstablishment[] {
  const records = new Map<string, SensitiveEstablishment>();
  for (const e of osmSchema.parse(input).elements) {
    const tags = e.tags ?? {};
    const type =
      tags.amenity === 'police' || tags.amenity === 'prison'
        ? tags.amenity
        : tags.landuse === 'military' ||
            (tags.military &&
              !['no', 'abandoned', 'disused'].includes(tags.military))
          ? 'military'
          : null;
    if (!type || tags.disused === 'yes' || tags.abandoned === 'yes') continue;
    const parsed = establishmentSchema.safeParse({
      id: `osm-${e.type}-${e.id}`,
      name:
        tags.name?.trim() ||
        {
          military: 'Military installation',
          police: 'Police station',
          prison: 'Prison',
        }[type],
      type,
      latitude: e.lat ?? e.center?.lat,
      longitude: e.lon ?? e.center?.lon,
      sourceReference: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      updatedAt: at,
    });
    if (parsed.success && isSupportedLocation(parsed.data))
      records.set(parsed.data.id, parsed.data);
  }
  return [...records.values()];
}
