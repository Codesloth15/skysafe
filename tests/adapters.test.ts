import { describe, it, expect } from 'vitest';
import { parse } from 'csv-parse/sync';
import {
  normalizeOurAirports,
  normalizeOverpass,
  validateAirportDataset,
} from '../src/infrastructure/adapters/airports';
import { parseAirspaceGeoJSON } from '../src/infrastructure/adapters/geojson';
import { zone, now } from './fixtures';
const csv =
  'id,ident,name,type,iso_country,latitude_deg,longitude_deg,icao_code,iata_code\n1,TEST,"Test, quoted airport",small_airport,PH,14,121,TEST,ZZZ\n2,US1,Outside PH,small_airport,US,14,121,,\n3,INV,Bad coordinates,small_airport,PH,100,121,,\n4,EMPTY,Empty coordinates,small_airport,PH,,121,,\n';
describe('External adapters', () => {
  it('parses quoted CSV values and filters countries and invalid coordinates', () => {
    const records = normalizeOurAirports(
      parse(csv, { columns: true }),
      new Date(now).toISOString(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Test, quoted airport');
    expect(records[0].icaoCode).toBe('TEST');
  });
  it('normalizes OSM way centers and heliports', () => {
    const records = normalizeOverpass({
      elements: [
        {
          id: 1,
          type: 'way',
          center: { lat: 14, lon: 121 },
          tags: { name: 'Synthetic helipad', aeroway: 'heliport' },
        },
        { id: 2, type: 'node', lat: 999, lon: 121 },
      ],
    });
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe('heliport');
    expect(records[0].source).toBe('OpenStreetMap contributors');
  });
  it('rejects malformed external data', () => {
    expect(() => normalizeOverpass({ elements: 'oops' })).toThrow();
    expect(() => validateAirportDataset({ airports: [] })).toThrow();
  });
  it('handles empty restriction collections without inventing zones', () => {
    const data = parseAirspaceGeoJSON({
      type: 'FeatureCollection',
      features: [],
    });
    expect(data.zones).toEqual([]);
    expect(data.coverageComplete).toBe(false);
    expect(data.source.status).toBe('missing');
  });
  it('requires complete provenance and valid closed geometry', () => {
    const { geometry, ...properties } = zone;
    const valid = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties, geometry }],
    };
    expect(parseAirspaceGeoJSON(valid).zones).toHaveLength(1);
    expect(() =>
      parseAirspaceGeoJSON({
        ...valid,
        features: [
          {
            type: 'Feature',
            properties: { name: 'Missing metadata' },
            geometry,
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseAirspaceGeoJSON({
        ...valid,
        features: [
          {
            type: 'Feature',
            properties,
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [120, 13],
                  [122, 13],
                  [122, 15],
                  [120, 15],
                ],
              ],
            },
          },
        ],
      }),
    ).toThrow();
  });
  it('rejects self-intersecting polygons and invalid effective dates', () => {
    const { geometry, ...properties } = zone;
    expect(() =>
      parseAirspaceGeoJSON({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties,
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [120, 13],
                  [122, 15],
                  [122, 13],
                  [120, 15],
                  [120, 13],
                ],
              ],
            },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseAirspaceGeoJSON({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {
              ...properties,
              effectiveUntil: '2020-01-01T00:00:00Z',
            },
          },
        ],
      }),
    ).toThrow();
  });
});
