import { describe, it, expect, vi, afterEach } from 'vitest';
import { PhotonGeocodingRepository } from '../src/infrastructure/repositories/geocoding-repository';
import { SearchLocation, localSearch } from '../src/application/use-cases';
import { airport } from './fixtures';
afterEach(() => vi.unstubAllGlobals());
describe('Place search', () => {
  it('normalizes Philippine geocoder results and excludes other countries', async () => {
    const feature = (name: string, code: string) => ({
      geometry: { type: 'Point', coordinates: [121, 14] },
      properties: {
        osm_id: 1,
        name,
        city: 'Test city',
        state: 'Test province',
        country: 'Philippines',
        countrycode: code,
      },
    });
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            feature('Synthetic place', 'PH'),
            feature('Outside country', 'US'),
          ],
        }),
      });
    vi.stubGlobal('fetch', fetch);
    const repository = new PhotonGeocodingRepository();
    const result = await repository.search('Synthetic place');
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBe(14);
    expect(result[0].longitude).toBe(121);
    expect(result[0].kind).toBe('place');
    await repository.search('Synthetic place');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('geocodes place names containing commas rather than treating them as invalid coordinates', async () => {
    const search = vi.fn().mockResolvedValue([]);
    await new SearchLocation({ search }).execute('Baguio, Benguet', []);
    expect(search).toHaveBeenCalledOnce();
    expect(
      localSearch('Test, quoted', [
        { ...airport, name: 'Test, quoted airport' },
      ]),
    ).toHaveLength(1);
  });
});
