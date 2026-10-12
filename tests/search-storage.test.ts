import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { localSearch, SearchLocation } from '../src/application/use-cases';
import { readStored, writeStored } from '../src/infrastructure/cache/storage';
import {
  preferencesSchema,
  defaults,
  useExplorer,
} from '../src/app/store/use-explorer';
import { airport } from './fixtures';
describe('Search and browser state', () => {
  it('validates coordinate search including empty fields', () => {
    expect(localSearch('14,121', [])[0].latitude).toBe(14);
    expect(localSearch('100,121', [])).toEqual([]);
    expect(localSearch(',121', [])).toEqual([]);
    expect(localSearch('14,121,1', [])).toEqual([]);
  });
  it('matches airport names and identifiers without network access', () => {
    expect(localSearch('synthetic', [airport])).toHaveLength(1);
  });
  it('retains local results when geocoding fails', async () => {
    const search = new SearchLocation({
      search: async () => {
        throw new Error('offline');
      },
    });
    const result = await search.execute('Synthetic', [airport]);
    expect(result.results).toHaveLength(1);
    expect(result.warning).toContain('unavailable');
  });
  it('does not geocode coordinates', async () => {
    const search = vi.fn();
    await new SearchLocation({ search }).execute('14,121', []);
    expect(search).not.toHaveBeenCalled();
  });
  it('rejects malformed and out-of-schema local storage', () => {
    localStorage.setItem('airsafe:bad', '{broken');
    expect(readStored('bad', z.array(z.string()), [])).toEqual([]);
    writeStored('bad', [123]);
    expect(readStored('bad', z.array(z.string()), [])).toEqual([]);
    expect(
      preferencesSchema.safeParse({
        layers: defaults,
        radius: 100,
        theme: 'dark',
        basemap: 'street',
      }).success,
    ).toBe(false);
  });
  it('persists layer and radius preferences', () => {
    useExplorer.getState().setLayer('airports', false);
    useExplorer.getState().setRadius(10);
    expect(useExplorer.getState().layers.airports).toBe(false);
    const stored = readStored('preferences', preferencesSchema, {
      layers: defaults,
      radius: 5,
      theme: 'light',
      basemap: 'street',
    });
    expect(stored.radius).toBe(10);
    expect(stored.layers.airports).toBe(false);
    useExplorer.getState().setLayer('airports', true);
    useExplorer.getState().setRadius(5);
  });
  it('saves and removes favorite locations', () => {
    useExplorer.getState().select({ latitude: 14, longitude: 121 });
    expect(useExplorer.getState().save('Test favorite')).toBe(true);
    const favorite = useExplorer.getState().favorites[0];
    expect(favorite.name).toBe('Test favorite');
    useExplorer.getState().remove(favorite.id);
    expect(useExplorer.getState().favorites).toHaveLength(0);
  });
});
