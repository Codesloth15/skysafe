import { describe, it, expect, vi, afterEach } from 'vitest';
import { StaticAirportRepository } from '../src/infrastructure/repositories/airport-repository';
import { GeoJSONAirspaceRepository } from '../src/infrastructure/repositories/airspace-repository';
import { OverpassAirportRepository } from '../src/infrastructure/repositories/overpass-repository';
import { request } from '../src/infrastructure/api/http';
import { airport } from './fixtures';
import { writeStored } from '../src/infrastructure/cache/storage';
afterEach(() => vi.unstubAllGlobals());
const dataset = {
  airports: [airport],
  sources: [
    {
      name: 'Tests',
      url: 'https://example.com',
      attribution: 'Test fixtures',
      importedAt: airport.updatedAt,
      status: 'available',
      message: 'Synthetic',
    },
  ],
  importedAt: airport.updatedAt,
};
describe('Repository failures', () => {
  it('reports HTTP errors rather than returning empty successful results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await expect(new StaticAirportRepository().getAll()).rejects.toThrow('503');
    await expect(new GeoJSONAirspaceRepository().getZones()).rejects.toThrow(
      '503',
    );
  });
  it('uses a validated cached airport snapshot and explicitly marks it stale', async () => {
    writeStored('airport-cache', dataset);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    const result = await new StaticAirportRepository().getAll();
    expect(result.airports).toHaveLength(1);
    expect(result.sources[0].status).toBe('stale');
  });
  it('validates successful JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ invalid: true }) }),
    );
    await expect(new StaticAirportRepository().getAll()).rejects.toThrow();
  });
  it('does not allow nationwide Overpass requests', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      new OverpassAirportRepository().getArea({
        south: 4,
        west: 116,
        north: 22,
        east: 127,
      }),
    ).rejects.toThrow('Zoom in');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('enforces the OSM cooldown across repository instances', async () => {
    writeStored('osm-last-request', Date.now());
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      new OverpassAirportRepository().getArea({
        south: 14,
        west: 121,
        north: 14.3,
        east: 121.3,
      }),
    ).rejects.toThrow('30 seconds');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('shows a helpful rate-limit error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    await expect(request('https://example.com')).rejects.toThrow('rate limit');
  });
});
