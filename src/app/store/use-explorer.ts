import { create } from 'zustand';
import { z } from 'zod';
import type {
  GeographicLocation,
  SavedLocation,
  SearchResult,
} from '../../domain/entities';
import { coordinatesSchema } from '../../domain/services/geography';
import { readStored, writeStored } from '../../infrastructure/cache/storage';
export const layerSchema = z.object({
  airports: z.boolean(),
  heliports: z.boolean(),
  proximity: z.boolean(),
  prohibited: z.boolean(),
  restricted: z.boolean(),
  controlled: z.boolean(),
  advisory: z.boolean(),
});
export type Layers = z.infer<typeof layerSchema>;
export const defaults = {
  airports: true,
  heliports: true,
  proximity: true,
  prohibited: true,
  restricted: true,
  controlled: true,
  advisory: true,
};
export const preferencesSchema = z.object({
  layers: layerSchema,
  radius: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  theme: z.enum(['light', 'dark']),
  basemap: z.enum(['street', 'satellite']),
});
export const savedSchema = z
  .array(
    coordinatesSchema.extend({
      id: z.string(),
      name: z.string().trim().min(1).max(100),
      createdAt: z.string().datetime({ offset: true }),
    }),
  )
  .max(100);
export const recentSchema = z
  .array(
    coordinatesSchema.extend({
      id: z.string(),
      name: z.string(),
      detail: z.string(),
      kind: z.enum(['airport', 'place', 'coordinates']),
    }),
  )
  .max(8);
const preferences = readStored<z.infer<typeof preferencesSchema>>(
  'preferences',
  preferencesSchema,
  { layers: defaults, radius: 5, theme: 'light', basemap: 'street' },
);
interface State {
  layers: Layers;
  radius: 3 | 5 | 10;
  theme: 'light' | 'dark';
  basemap: 'street' | 'satellite';
  selected: GeographicLocation | null;
  target: GeographicLocation | null;
  selectionName: string;
  favorites: SavedLocation[];
  recent: SearchResult[];
  storageError: boolean;
  setLayer: (key: keyof Layers, value: boolean) => void;
  setRadius: (value: 3 | 5 | 10) => void;
  setTheme: (value: 'light' | 'dark') => void;
  setBasemap: (value: 'street' | 'satellite') => void;
  select: (point: GeographicLocation, name?: string, fly?: boolean) => void;
  remember: (result: SearchResult) => void;
  save: (name: string) => boolean;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  clearRecent: () => void;
}
export const useExplorer = create<State>((set, get) => {
  function persistPreferences(
    update: Partial<Pick<State, 'layers' | 'radius' | 'theme' | 'basemap'>>,
  ) {
    const state = { ...get(), ...update };
    const ok = writeStored('preferences', {
      layers: state.layers,
      radius: state.radius,
      theme: state.theme,
      basemap: state.basemap,
    });
    set({ ...update, storageError: !ok });
  }
  function storeFavorites(favorites: SavedLocation[]) {
    const parsed = savedSchema.safeParse(favorites);
    if (!parsed.success) return false;
    const ok = writeStored('favorites', parsed.data);
    set({ favorites: parsed.data, storageError: !ok });
    return true;
  }
  return {
    ...preferences,
    selected: null,
    target: null,
    selectionName: 'Selected location',
    favorites: readStored('favorites', savedSchema, []),
    recent: readStored('recent', recentSchema, []),
    storageError: false,
    setLayer: (key, value) =>
      persistPreferences({ layers: { ...get().layers, [key]: value } }),
    setRadius: (radius) => persistPreferences({ radius }),
    setTheme: (theme) => persistPreferences({ theme }),
    setBasemap: (basemap) => persistPreferences({ basemap }),
    select: (point, name = 'Selected location', fly = false) => {
      coordinatesSchema.parse(point);
      set({
        selected: point,
        selectionName: name,
        ...(fly ? { target: { ...point } } : {}),
      });
    },
    remember: (result) => {
      const recent = [
        result,
        ...get().recent.filter((r) => r.id !== result.id),
      ].slice(0, 8);
      const parsed = recentSchema.safeParse(recent);
      if (!parsed.success) return;
      const ok = writeStored('recent', parsed.data);
      set({ recent: parsed.data, storageError: !ok });
    },
    save: (name) => {
      const point = get().selected;
      if (!point) return false;
      return storeFavorites([
        {
          ...point,
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
        },
        ...get().favorites,
      ]);
    },
    remove: (id) => {
      storeFavorites(get().favorites.filter((f) => f.id !== id));
    },
    rename: (id, name) => {
      storeFavorites(
        get().favorites.map((f) => (f.id === id ? { ...f, name } : f)),
      );
    },
    clearRecent: () => {
      const ok = writeStored('recent', []);
      set({ recent: [], storageError: !ok });
    },
  };
});
