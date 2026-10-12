import { describe, it, expect } from 'vitest';
import { distance } from '@turf/turf';
import {
  coordinatesSchema,
  airportDistance,
  advisoryCircle,
  deduplicateAirports,
  containsLocation,
} from '../src/domain/services/geography';
import { airport, zone } from './fixtures';
describe('Geographic safety primitives', () => {
  it.each([
    { latitude: 91, longitude: 121 },
    { latitude: 14, longitude: 181 },
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
  ])('rejects invalid coordinates %j', (p) =>
    expect(coordinatesSchema.safeParse(p).success).toBe(false),
  );
  it('accepts valid edge coordinates', () =>
    expect(
      coordinatesSchema.safeParse({ latitude: -90, longitude: 180 }).success,
    ).toBe(true));
  it('calculates geodesic kilometers', () => {
    expect(
      airportDistance(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(111.195, 2);
    expect(airportDistance(airport, airport)).toBe(0);
  });
  it.each([3, 5, 10])('generates a %i km Turf ring', (radius) => {
    const ring = advisoryCircle(airport, radius);
    expect(
      distance(
        [airport.longitude, airport.latitude],
        ring.geometry.coordinates[0][0],
        { units: 'kilometers' },
      ),
    ).toBeCloseTo(radius, 5);
  });
  it('deduplicates codes and colocated OSM records without merging nearby heliports with airports', () => {
    const data = deduplicateAirports([
      airport,
      { ...airport, id: 'osm-1', name: 'Other name' },
      { ...airport, id: 'heliport', type: 'heliport', name: 'Helipad' },
    ]);
    expect(data).toHaveLength(2);
  });
  it('checks polygon interior and exterior', () => {
    expect(containsLocation(zone, airport)).toBe(true);
    expect(containsLocation(zone, { latitude: 16, longitude: 121 })).toBe(
      false,
    );
  });
  it('supports polygon holes and multipolygons', () => {
    const holes = {
      ...zone,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          zone.geometry.coordinates[0] as number[][],
          [
            [120.5, 13.5],
            [121.5, 13.5],
            [121.5, 14.5],
            [120.5, 14.5],
            [120.5, 13.5],
          ],
        ],
      },
    };
    expect(containsLocation(holes, airport)).toBe(false);
    const multi = {
      ...zone,
      geometry: {
        type: 'MultiPolygon' as const,
        coordinates: [
          (zone.geometry as { coordinates: number[][][] }).coordinates,
        ],
      },
    };
    expect(containsLocation(multi, airport)).toBe(true);
  });
});
