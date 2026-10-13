import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { destination } from '@turf/turf';
import {
  departureTimestamp,
  estimateFlight,
  groundSpeed,
  phLocalTime,
  previewPosition,
  type PlanSettings,
} from '../src/domain/services/flight-plan';
import { windForDeparture } from '../src/infrastructure/repositories/wind-repository';
import { useFlightPlan } from '../src/app/store/use-flight-plan';
import { zone } from './fixtures';

const start = { latitude: 14, longitude: 121 };
const [longitude, latitude] = destination([121, 14], 1, 0).geometry.coordinates;
const north = { latitude, longitude };
const settings: PlanSettings = {
  mode: 'Normal',
  cruiseMps: 10,
  durationMinutes: 12,
  reservePercent: 30,
  overheadMinutes: 2,
  returnToStart: true,
  departure: '2026-10-13T14:30',
  windSource: 'manual',
  manualWind: { speedMps: 0, fromDegrees: 0, gustMps: 0 },
};
beforeEach(() => {
  useFlightPlan.getState().setAirspace([], 'ready');
});
afterEach(() => {
  useFlightPlan.getState().clear();
  useFlightPlan.getState().setActive(false);
  useFlightPlan.getState().setAirspace([], 'ready');
});
describe('Flight route estimates', () => {
  it('includes the return leg, hover allowance, and reserve', () => {
    const estimate = estimateFlight(
      [start, north],
      settings,
      settings.manualWind,
    );
    expect(estimate.distanceKm).toBeCloseTo(2, 5);
    expect(estimate.totalMinutes).toBeCloseTo((2 * 1000) / 10 / 60 + 2);
    expect(estimate.availableMinutes).toBe(12);
    expect(estimate.legs[1].returning).toBe(true);
    const short = estimateFlight(
      [start, north],
      { ...settings, durationMinutes: 2 },
      null,
    );
    expect(short.overBudget).toBe(true);
    expect(
      estimateFlight([start, north], { ...settings, durationMinutes: 20 }, null)
        .availableMinutes,
    ).toBe(14);
  });
  it('distinguishes headwind, tailwind, crosswind and unreachable legs', () => {
    expect(
      groundSpeed(10, 0, { speedMps: 5, fromDegrees: 0, gustMps: 5 }),
    ).toBe(5);
    expect(
      groundSpeed(10, 180, { speedMps: 5, fromDegrees: 0, gustMps: 5 }),
    ).toBe(15);
    expect(
      groundSpeed(10, 90, { speedMps: 6, fromDegrees: 0, gustMps: 6 }),
    ).toBeCloseTo(8);
    const windy = estimateFlight([start, north], settings, {
      speedMps: 11,
      fromDegrees: 0,
      gustMps: 14,
    });
    expect(windy.blocked).toBe(true);
    expect(windy.windExceeded).toBe(true);
    expect(previewPosition(windy, 0.5)).toBeNull();
  });
  it('one-way routes exclude return and the preview follows elapsed leg time', () => {
    const estimate = estimateFlight(
      [start, north],
      { ...settings, returnToStart: false },
      null,
    );
    expect(estimate.distanceKm).toBeCloseTo(1);
    expect(previewPosition(estimate, 1)?.latitude).toBeCloseTo(north.latitude);
    const roundtrip = estimateFlight([start, north], settings, {
      speedMps: 5,
      fromDegrees: 0,
      gustMps: 5,
    });
    expect(previewPosition(roundtrip, 0.75)?.latitude).toBeCloseTo(
      north.latitude,
    );
    expect(previewPosition(roundtrip, 1)?.latitude).toBeCloseTo(start.latitude);
  });
  it('checks entire segments, including zones active during the departure window', () => {
    const boundary = { ...zone, effectiveFrom: '2026-10-13T06:35:00Z' };
    const route = [
      { latitude: 14, longitude: 119 },
      { latitude: 14, longitude: 123 },
    ];
    expect(estimateFlight(route, settings, null, [boundary]).zoneNames).toEqual(
      [zone.name],
    );
    expect(
      estimateFlight(route, settings, null, [
        { ...zone, verificationStatus: 'unverified' },
      ]).zoneNames,
    ).toEqual([]);
    expect(
      estimateFlight(route, settings, null, [
        { ...zone, effectiveUntil: '2026-10-12T00:00:00Z' },
      ]).zoneNames,
    ).toEqual([]);
  });
  it('handles missing and repeated route points without false flight time', () => {
    expect(estimateFlight([], settings, null).totalMinutes).toBe(0);
    expect(estimateFlight([start, start], settings, null).legs).toEqual([]);
  });
});
describe('Departure forecast', () => {
  const time = Date.parse('2026-10-13T06:00:00Z') / 1000;
  const forecast = {
    fetchedAt: 0,
    hourly: {
      time: [time, time + 3600],
      wind_speed_10m: [2, 5],
      wind_direction_10m: [90, 180],
      wind_gusts_10m: [8, 6],
    },
  };
  it('uses Philippine time regardless of the host timezone', () => {
    expect(departureTimestamp('2026-10-13T14:30')).toBe(
      Date.parse('2026-10-13T06:30:00Z'),
    );
    expect(phLocalTime(Date.parse('2026-10-13T18:00:00Z'))).toBe(
      '2026-10-14T02:00',
    );
    expect(Number.isNaN(departureTimestamp(''))).toBe(true);
  });
  it('covers the entire budget across an hourly boundary', () => {
    expect(
      windForDeparture(forecast, departureTimestamp('2026-10-13T14:55'), 12),
    ).toEqual({ speedMps: 5, fromDegrees: 180, gustMps: 8 });
  });
  it('does not silently substitute calm wind for missing data or out-of-range dates', () => {
    expect(() =>
      windForDeparture(forecast, departureTimestamp('2026-10-15T14:00'), 12),
    ).toThrow('unavailable');
    expect(() =>
      windForDeparture(
        {
          ...forecast,
          hourly: { ...forecast.hourly, wind_speed_10m: [null, 5] },
        },
        departureTimestamp('2026-10-13T14:00'),
        12,
      ),
    ).toThrow('unavailable');
  });
});
describe('Route editing', () => {
  it('moves, removes and validates waypoints while resetting preview', () => {
    const plan = useFlightPlan.getState();
    expect(plan.addPoint(start)).toBe(true);
    expect(plan.addPoint(start)).toBe(false);
    expect(plan.addPoint({ latitude: 90, longitude: 121 })).toBe(false);
    plan.addPoint(north);
    plan.setProgress(0.5);
    expect(plan.movePoint(1, { latitude: 14.02, longitude: 121 })).toBe(true);
    expect(useFlightPlan.getState().progress).toBe(0);
    plan.removePoint(1);
    expect(useFlightPlan.getState().points).toEqual([start]);
  });
  it('clamps cruise speed when switching drone modes', () => {
    useFlightPlan.getState().update({ mode: 'Manual', cruiseMps: 30 });
    useFlightPlan.getState().update({ mode: 'Normal' });
    expect(useFlightPlan.getState().settings.cruiseMps).toBe(15);
  });
});
