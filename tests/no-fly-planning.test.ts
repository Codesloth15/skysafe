import { beforeEach, describe, expect, it } from 'vitest';
import { useFlightPlan } from '../src/app/store/use-flight-plan';
import {
  estimateFlight,
  previewPosition,
} from '../src/domain/services/flight-plan';
import { zone } from './fixtures';
import type { AirspaceZone } from '../src/domain/entities';

const west = { latitude: 14, longitude: 119.9 };
const east = { latitude: 14, longitude: 122.1 };
const northwest = { latitude: 15.1, longitude: 119.9 };
const northeast = { latitude: 15.1, longitude: 122.1 };
beforeEach(() => {
  const plan = useFlightPlan.getState();
  plan.clear();
  plan.setAirspace([zone], 'ready');
  plan.update({
    departure: '2026-10-13T14:30',
    durationMinutes: 12,
    cruiseMps: 10,
    returnToStart: false,
    windSource: 'manual',
    manualWind: { speedMps: 0, gustMps: 0, fromDegrees: 0 },
  });
});

describe('No-fly route enforcement', () => {
  it('rejects starts inside or on the boundary through all entry paths', () => {
    const plan = useFlightPlan.getState();
    expect(plan.addPoint({ latitude: 14, longitude: 121 })).toBe(false);
    expect(plan.setStart({ latitude: 14, longitude: 120 })).toBe(false);
    expect(useFlightPlan.getState().points).toEqual([]);
    expect(useFlightPlan.getState().actionError).toContain(zone.name);
  });
  it('rejects a crossing with both endpoints outside and retains the last valid route', () => {
    const plan = useFlightPlan.getState();
    expect(plan.addPoint(west)).toBe(true);
    expect(plan.addPoint(east)).toBe(false);
    expect(useFlightPlan.getState().points).toEqual([west]);
    expect(plan.addPoint(northwest)).toBe(true);
    expect(plan.movePoint(1, east)).toBe(false);
    expect(useFlightPlan.getState().points).toEqual([west, northwest]);
  });
  it('rejects removing a detour when the new connecting leg crosses a no-fly zone', () => {
    const plan = useFlightPlan.getState();
    [west, northwest, northeast, east].forEach((p) =>
      expect(plan.addPoint(p)).toBe(true),
    );
    expect(plan.removePoint(1)).toBe(false);
    expect(useFlightPlan.getState().points).toHaveLength(4);
    plan.clear();
    expect(useFlightPlan.getState().points).toHaveLength(0);
  });
  it('blocks return segments and stops preview when a setting invalidates the route', () => {
    const plan = useFlightPlan.getState();
    [west, northwest, northeast, east].forEach((p) => plan.addPoint(p));
    plan.setPlaying(true);
    expect(useFlightPlan.getState().playing).toBe(true);
    plan.update({ returnToStart: true });
    expect(useFlightPlan.getState().validationError).toContain('no-fly zone');
    plan.setPlaying(true);
    plan.setProgress(0.5);
    expect(useFlightPlan.getState().playing).toBe(false);
    expect(useFlightPlan.getState().progress).toBe(0);
    const estimate = estimateFlight(
      useFlightPlan.getState().points,
      useFlightPlan.getState().settings,
      null,
      [zone],
    );
    expect(estimate.airspaceBlocked).toBe(true);
    expect(previewPosition(estimate, 0.5)).toBeNull();
    plan.update({ returnToStart: false });
    expect(useFlightPlan.getState().validationError).toBeNull();
  });
  it('rechecks departures, duration, newly loaded restrictions and provider errors', () => {
    const plan = useFlightPlan.getState();
    plan.setAirspace(
      [{ ...zone, effectiveFrom: '2026-10-13T07:00:00Z' }],
      'ready',
    );
    plan.update({ departure: '2026-10-13T14:00' });
    expect(plan.addPoint({ latitude: 14, longitude: 121 })).toBe(true);
    plan.update({ departure: '2026-10-13T14:55' });
    expect(useFlightPlan.getState().validationError).toContain('no-fly zone');
    plan.update({ departure: '2026-10-13T14:00' });
    plan.setAirspace([zone], 'ready');
    expect(useFlightPlan.getState().validationError).toContain(zone.name);
    plan.clear();
    plan.setAirspace([], 'loading');
    expect(plan.addPoint(west)).toBe(false);
    plan.setAirspace([], 'error');
    expect(plan.addPoint(west)).toBe(false);
    plan.setAirspace([], 'ready');
    expect(plan.addPoint(west)).toBe(true);
    plan.update({ departure: '' });
    expect(useFlightPlan.getState().validationError).toContain(
      'valid departure',
    );
  });
  it('does not convert advisories or expired/unverified polygons into no-fly zones', () => {
    const plan = useFlightPlan.getState();
    const cases: AirspaceZone[] = [
      { ...zone, category: 'AIRPORT_ADVISORY' },
      { ...zone, category: 'CONTROLLED' },
      { ...zone, effectiveUntil: '2026-10-12T00:00:00Z' },
      { ...zone, verificationStatus: 'unverified' },
    ];
    for (const candidate of cases) {
      plan.clear();
      plan.setAirspace([candidate], 'ready');
      expect(plan.setStart({ latitude: 14, longitude: 121 })).toBe(true);
    }
  });
  it('supports polygon holes and multipolygon components', () => {
    const plan = useFlightPlan.getState();
    const hole = [
      [120.5, 13.5],
      [120.5, 14.5],
      [121.5, 14.5],
      [121.5, 13.5],
      [120.5, 13.5],
    ];
    const outer =
      zone.geometry.type === 'Polygon' ? zone.geometry.coordinates[0] : [];
    plan.setAirspace(
      [
        {
          ...zone,
          geometry: { type: 'MultiPolygon', coordinates: [[outer, hole]] },
        },
      ],
      'ready',
    );
    expect(plan.addPoint({ latitude: 14, longitude: 121 })).toBe(true);
    expect(plan.addPoint(east)).toBe(false);
  });
});
