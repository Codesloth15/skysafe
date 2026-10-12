import { booleanPointInPolygon, circle, distance, point } from '@turf/turf';
import { z } from 'zod';
import type { Airport, AirspaceZone, GeographicLocation } from '../entities';
export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
export function isSupportedLocation(p: GeographicLocation) {
  return (
    p.latitude >= 4 &&
    p.latitude <= 22 &&
    p.longitude >= 116 &&
    p.longitude <= 127
  );
}
export function airportDistance(a: GeographicLocation, b: GeographicLocation) {
  coordinatesSchema.parse(a);
  coordinatesSchema.parse(b);
  return distance([a.longitude, a.latitude], [b.longitude, b.latitude], {
    units: 'kilometers',
  });
}
export function advisoryCircle(airport: GeographicLocation, radiusKm: number) {
  if (![3, 5, 10].includes(radiusKm))
    throw new Error('Unsupported advisory radius');
  return circle([airport.longitude, airport.latitude], radiusKm, {
    steps: 48,
    units: 'kilometers',
  });
}
export function containsLocation(zone: AirspaceZone, p: GeographicLocation) {
  return booleanPointInPolygon(point([p.longitude, p.latitude]), zone.geometry);
}
export function deduplicateAirports(airports: Airport[]) {
  const result: Airport[] = [];
  const ids = new Set<string>();
  for (const a of airports) {
    if (ids.has(a.id)) continue;
    const duplicate = result.some(
      (b) =>
        Boolean(a.icaoCode && a.icaoCode === b.icaoCode) ||
        Boolean(a.iataCode && a.iataCode === b.iataCode) ||
        ((a.type === 'heliport') === (b.type === 'heliport') &&
          airportDistance(a, b) < 0.25) ||
        (a.name.toLowerCase() === b.name.toLowerCase() &&
          airportDistance(a, b) < 2),
    );
    if (!duplicate) {
      ids.add(a.id);
      result.push(a);
    }
  }
  return result;
}
