import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { normalizeEstablishments } from '../src/infrastructure/adapters/establishments';
import { normalizeOverpass } from '../src/infrastructure/adapters/airports';
import { OverpassAirportRepository } from '../src/infrastructure/repositories/overpass-repository';
import EstablishmentAdvisory from '../src/presentation/components/airspace/EstablishmentAdvisory';
import {
  layerSchema,
  defaults,
  useExplorer,
} from '../src/app/store/use-explorer';

const elements = [
  {
    id: 1,
    type: 'node',
    lat: 14,
    lon: 121,
    tags: { amenity: 'police', name: 'Test police' },
  },
  {
    id: 2,
    type: 'way',
    center: { lat: 14.01, lon: 121 },
    tags: { landuse: 'military' },
  },
  {
    id: 3,
    type: 'relation',
    center: { lat: 14.02, lon: 121 },
    tags: { amenity: 'prison' },
  },
  { id: 4, type: 'node', lat: 14.03, lon: 121, tags: { aeroway: 'heliport' } },
];
describe('Sensitive establishments', () => {
  it('handles points and centers without turning establishments into airports', () => {
    const records = normalizeEstablishments({
      elements: [...elements, elements[0]],
    });
    expect(records.map((item) => item.type)).toEqual([
      'police',
      'military',
      'prison',
    ]);
    expect(records[0].sourceReference).toBe(
      'https://www.openstreetmap.org/node/1',
    );
    expect(normalizeOverpass({ elements })).toHaveLength(1);
    expect(normalizeOverpass({ elements })[0].type).toBe('heliport');
  });
  it('rejects invalid, unsupported, inactive and unrelated records', () => {
    expect(
      normalizeEstablishments({
        elements: [
          { ...elements[0], lat: 999 },
          { ...elements[0], lat: 40 },
          { ...elements[0], tags: { amenity: 'police', disused: 'yes' } },
          { ...elements[0], tags: { military: 'no' } },
          { ...elements[0], tags: { amenity: 'cafe' } },
        ],
      }),
    ).toEqual([]);
  });
  it('fetches all categories in one request and caches both datasets', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ elements }) });
    vi.stubGlobal('fetch', fetch);
    try {
      const repo = new OverpassAirportRepository();
      const bounds = { south: 14, west: 121, north: 14.3, east: 121.3 };
      const result = await repo.getAreaData(bounds);
      expect(result.establishments).toHaveLength(3);
      expect(result.airports).toHaveLength(1);
      const cached = await repo.getAreaData(bounds);
      expect(cached.establishments).toEqual(result.establishments);
      expect(cached.airports).toEqual(result.airports);
      expect(fetch).toHaveBeenCalledTimes(1);
      const body = fetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('data')).toContain('["amenity"="police"]');
      expect(body.get('data')).toContain('["military"]');
      expect(body.get('data')).toContain('["amenity"="prison"]');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('preserves existing layer preferences when upgrading', () => {
    const { establishments: _omitted, ...old } = defaults;
    void _omitted;
    expect(layerSchema.parse({ ...old, airports: false })).toMatchObject({
      airports: false,
      establishments: true,
    });
  });
  it('focuses nearby establishments on the map and excludes distant establishments', () => {
    const client = new QueryClient();
    client.setQueryData(
      ['osm-establishments'],
      normalizeEstablishments({
        elements: [
          ...elements,
          {
            ...elements[0],
            id: 99,
            lat: 18,
            tags: { amenity: 'police', name: 'Distant police' },
          },
        ],
      }),
    );
    render(
      <QueryClientProvider client={client}>
        <EstablishmentAdvisory location={{ latitude: 14, longitude: 121 }} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('3 within 25 km')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Test police' }));
    expect(useExplorer.getState().target).toMatchObject({
      latitude: 14,
      longitude: 121,
      zoom: 15,
    });
    expect(useExplorer.getState().selectionName).toBe('Test police');
    expect(
      screen.queryByRole('link', { name: 'Test police' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Distant police')).not.toBeInTheDocument();
    expect(screen.getByText(/not site boundaries/)).toBeInTheDocument();
  });
  it('explains how to load missing data', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EstablishmentAdvisory location={{ latitude: 14, longitude: 121 }} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Load nearby OSM/)).toBeInTheDocument();
  });
});
