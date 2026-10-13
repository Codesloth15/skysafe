import { create } from 'zustand';
import type { GeographicLocation, AirspaceZone } from '../../domain/entities';
import {
  airportDistance,
  coordinatesSchema,
  isSupportedLocation,
} from '../../domain/services/geography';
import {
  DJI_FPV,
  phLocalTime,
  type PlanSettings,
  type Wind,
  estimateFlight,
  departureTimestamp,
} from '../../domain/services/flight-plan';

interface FlightPlanState {
  active: boolean;
  expanded: boolean;
  drawing: boolean;
  points: GeographicLocation[];
  settings: PlanSettings;
  progress: number;
  playing: boolean;
  fitRequest: number;
  zones: AirspaceZone[];
  airspaceStatus: 'loading' | 'ready' | 'error';
  forecastWind: Wind | null;
  validationError: string | null;
  actionError: string | null;
  setAirspace: (
    zones: AirspaceZone[],
    status: FlightPlanState['airspaceStatus'],
  ) => void;
  setForecastWind: (wind: Wind | null) => void;
  setActive: (active: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setDrawing: (drawing: boolean) => void;
  addPoint: (point: GeographicLocation) => boolean;
  movePoint: (index: number, point: GeographicLocation) => boolean;
  removePoint: (index: number) => boolean;
  setStart: (point: GeographicLocation) => boolean;
  clear: () => void;
  update: (settings: Partial<PlanSettings>) => void;
  setProgress: (progress: number) => void;
  setPlaying: (playing: boolean) => void;
  fit: () => void;
}
const validPoint = (point: GeographicLocation) =>
  coordinatesSchema.safeParse(point).success && isSupportedLocation(point);
const resetPreview = { progress: 0, playing: false };
function restrictionError(
  state: Pick<FlightPlanState, 'zones' | 'airspaceStatus' | 'forecastWind'>,
  points: GeographicLocation[],
  settings: PlanSettings,
): string | null {
  if (!points.length) return null;
  if (state.airspaceStatus !== 'ready')
    return state.airspaceStatus === 'error'
      ? 'Flight planning blocked: airspace data is unavailable. Retry loading airspace data.'
      : 'Flight planning blocked: wait for airspace data to load.';
  if (!Number.isFinite(departureTimestamp(settings.departure)))
    return 'Flight planning blocked: choose a valid departure date and time.';
  const estimate = estimateFlight(
    points,
    settings,
    settings.windSource === 'manual' ? settings.manualWind : state.forecastWind,
    state.zones,
  );
  return estimate.airspaceBlocked
    ? 'Flight planning blocked: route enters a no-fly zone (' +
        estimate.noFlyZoneNames.join(', ') +
        '). Choose a different start or route.'
    : null;
}
export const useFlightPlan = create<FlightPlanState>((set, get) => ({
  active: false,
  expanded: false,
  drawing: false,
  points: [],
  ...resetPreview,
  fitRequest: 0,
  zones: [],
  airspaceStatus: 'loading',
  forecastWind: null,
  validationError: null,
  actionError: null,
  setAirspace: (zones, airspaceStatus) => {
    const state = get();
    const validationError = restrictionError(
      { ...state, zones, airspaceStatus },
      state.points,
      state.settings,
    );
    set({
      zones,
      airspaceStatus,
      validationError,
      ...(validationError ? resetPreview : {}),
    });
  },
  setForecastWind: (forecastWind) => {
    const state = get();
    const validationError = restrictionError(
      { ...state, forecastWind },
      state.points,
      state.settings,
    );
    set({
      forecastWind,
      validationError,
      ...(validationError ? resetPreview : {}),
    });
  },
  settings: {
    mode: 'Normal',
    cruiseMps: 10,
    durationMinutes: 12,
    reservePercent: 30,
    overheadMinutes: 2,
    returnToStart: true,
    departure: phLocalTime(Math.ceil(Date.now() / 900000) * 900000),
    windSource: 'forecast',
    manualWind: { speedMps: 0, fromDegrees: 0, gustMps: 0 },
  },
  setActive: (active) =>
    set({ active, expanded: active, drawing: false, playing: false }),
  setExpanded: (expanded) => set({ expanded }),
  setDrawing: (drawing) => set({ drawing, expanded: !drawing, playing: false }),
  addPoint: (point) => {
    set({ actionError: null });
    const points = get().points;
    if (
      !validPoint(point) ||
      points.length >= 30 ||
      (points.length &&
        airportDistance(points[points.length - 1], point) < 0.001)
    )
      return false;
    const next = [
      ...points,
      { latitude: point.latitude, longitude: point.longitude },
    ];
    const error = restrictionError(get(), next, get().settings);
    if (error) {
      set({ actionError: error });
      return false;
    }
    set({
      points: next,
      actionError: null,
      validationError: null,
      ...resetPreview,
    });
    return true;
  },
  movePoint: (index, point) => {
    set({ actionError: null });
    if (!validPoint(point) || !get().points[index]) return false;
    const next = get().points.map((old, i) => (i === index ? point : old));
    const error = restrictionError(get(), next, get().settings);
    if (error) {
      set({ actionError: error });
      return false;
    }
    set({
      points: next,
      actionError: null,
      validationError: null,
      ...resetPreview,
    });
    return true;
  },
  removePoint: (index) => {
    const next = get().points.filter((_, i) => i !== index);
    const error = restrictionError(get(), next, get().settings);
    if (error) {
      set({ actionError: error });
      return false;
    }
    set({
      points: next,
      actionError: null,
      validationError: null,
      ...resetPreview,
    });
    return true;
  },
  setStart: (point) => {
    set({ actionError: null });
    if (!validPoint(point)) return false;
    const next = [
      { latitude: point.latitude, longitude: point.longitude },
      ...get().points.slice(1),
    ];
    const error = restrictionError(get(), next, get().settings);
    if (error) {
      set({ actionError: error });
      return false;
    }
    set({
      points: next,
      actionError: null,
      validationError: null,
      drawing: true,
      expanded: false,
      ...resetPreview,
    });
    return true;
  },
  clear: () =>
    set({
      points: [],
      drawing: false,
      validationError: null,
      actionError: null,
      ...resetPreview,
    }),
  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    settings.cruiseMps = Math.max(
      1,
      Math.min(DJI_FPV.speeds[settings.mode], settings.cruiseMps),
    );
    const validationError = restrictionError(get(), get().points, settings);
    set({ settings, validationError, actionError: null, ...resetPreview });
  },
  setProgress: (progress) => {
    const validationError = restrictionError(
      get(),
      get().points,
      get().settings,
    );
    set({
      validationError,
      progress: validationError ? 0 : Math.max(0, Math.min(1, progress)),
      playing: false,
    });
  },
  setPlaying: (playing) => {
    const validationError = restrictionError(
      get(),
      get().points,
      get().settings,
    );
    set({
      validationError,
      playing: playing && !validationError,
      ...(playing && get().progress >= 1 ? { progress: 0 } : {}),
    });
  },
  fit: () => set({ fitRequest: get().fitRequest + 1, expanded: false }),
}));
