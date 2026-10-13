import {
  bearing,
  booleanIntersects,
  destination,
  lineString,
  point,
} from '@turf/turf';
import type { AirspaceZone, GeographicLocation } from '../entities';
import { airportDistance } from './geography';

export const DJI_FPV = {
  id: 'dji-fpv',
  name: 'DJI FPV',
  type: 'FPV quadcopter',
  maxFlightMinutes: 20,
  maxWindMps: 13.8,
  speeds: { Normal: 15, Sport: 27, Manual: 39 },
  source: 'https://www.dji.com/support/product/dji-fpv',
  manual:
    'https://dl.djicdn.com/downloads/DJI_FPV/20210615/DJI_FPV_User_Manual_EN.pdf',
} as const;
export type FlightMode = keyof typeof DJI_FPV.speeds;
export interface Wind {
  speedMps: number;
  fromDegrees: number;
  gustMps: number;
}
export interface PlanSettings {
  mode: FlightMode;
  cruiseMps: number;
  durationMinutes: number;
  reservePercent: number;
  overheadMinutes: number;
  returnToStart: boolean;
  departure: string;
  windSource: 'forecast' | 'manual';
  manualWind: Wind;
}
export interface RouteLeg {
  from: GeographicLocation;
  to: GeographicLocation;
  distanceKm: number;
  heading: number;
  groundMps: number;
  minutes: number;
  cumulativeMinutes: number;
  returning: boolean;
  zoneNames: string[];
}
export function phLocalTime(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 16);
}
export function departureTimestamp(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? Date.parse(value + ':00+08:00')
    : NaN;
}
export function groundSpeed(
  airspeed: number,
  heading: number,
  wind: Wind | null,
) {
  if (!wind) return airspeed;
  const relative = ((wind.fromDegrees - heading) * Math.PI) / 180;
  const crosswind = wind.speedMps * Math.sin(relative);
  if (Math.abs(crosswind) >= airspeed) return 0;
  return Math.max(
    0,
    Math.sqrt(airspeed ** 2 - crosswind ** 2) -
      wind.speedMps * Math.cos(relative),
  );
}
export function estimateFlight(
  points: GeographicLocation[],
  settings: PlanSettings,
  wind: Wind | null,
  zones: AirspaceZone[] = [],
) {
  const availableMinutes = Math.min(
    settings.durationMinutes,
    DJI_FPV.maxFlightMinutes * (1 - settings.reservePercent / 100),
  );
  const startTime = departureTimestamp(settings.departure);
  const path =
    settings.returnToStart && points.length > 1
      ? [...points, points[0]]
      : points;
  let cumulativeMinutes = 0;
  const legs: RouteLeg[] = [];
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1],
      to = path[i];
    const distanceKm = airportDistance(from, to);
    if (distanceKm < 0.001) continue;
    const heading =
      (bearing([from.longitude, from.latitude], [to.longitude, to.latitude]) +
        360) %
      360;
    const groundMps = groundSpeed(settings.cruiseMps, heading, wind);
    const minutes =
      groundMps > 0.1 ? (distanceKm * 1000) / groundMps / 60 : Infinity;
    cumulativeMinutes += minutes;
    const line = lineString([
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ]);
    // Check any verified zone active during the planned time window, including transit overrun.
    const endTime =
      startTime +
      Math.max(
        settings.durationMinutes,
        Number.isFinite(cumulativeMinutes)
          ? cumulativeMinutes + settings.overheadMinutes
          : settings.durationMinutes,
      ) *
        60000;
    const zoneNames = zones
      .filter(
        (z) =>
          z.verificationStatus === 'verified' &&
          Date.parse(z.effectiveFrom) <= endTime &&
          (!z.effectiveUntil || Date.parse(z.effectiveUntil) > startTime) &&
          booleanIntersects(line, z.geometry),
      )
      .map((z) => z.name);
    legs.push({
      from,
      to,
      distanceKm,
      heading,
      groundMps,
      minutes,
      cumulativeMinutes,
      returning: settings.returnToStart && i === path.length - 1,
      zoneNames,
    });
  }
  const totalMinutes =
    cumulativeMinutes + (legs.length ? settings.overheadMinutes : 0);
  const windExceeded =
    !!wind && Math.max(wind.speedMps, wind.gustMps) >= DJI_FPV.maxWindMps;
  const endTime =
    startTime +
    Math.max(
      settings.durationMinutes,
      Number.isFinite(totalMinutes) ? totalMinutes : settings.durationMinutes,
    ) *
      60000;
  const noFlyZoneNames = zones
    .filter(
      (zone) =>
        zone.verificationStatus === 'verified' &&
        ['PROHIBITED', 'RESTRICTED'].includes(zone.category) &&
        Date.parse(zone.effectiveFrom) <= endTime &&
        (!zone.effectiveUntil || Date.parse(zone.effectiveUntil) > startTime) &&
        (points.some((p) =>
          booleanIntersects(point([p.longitude, p.latitude]), zone.geometry),
        ) ||
          legs.some((leg) =>
            booleanIntersects(
              lineString([
                [leg.from.longitude, leg.from.latitude],
                [leg.to.longitude, leg.to.latitude],
              ]),
              zone.geometry,
            ),
          )),
    )
    .map((zone) => zone.name);
  return {
    legs,
    totalMinutes,
    transitMinutes: cumulativeMinutes,
    availableMinutes,
    distanceKm: legs.reduce((sum, leg) => sum + leg.distanceKm, 0),
    overBudget: totalMinutes > availableMinutes,
    windExceeded,
    noFlyZoneNames,
    airspaceBlocked: noFlyZoneNames.length > 0,
    blocked: legs.some((leg) => !Number.isFinite(leg.minutes)),
    zoneNames: [...new Set(legs.flatMap((leg) => leg.zoneNames))],
    remainingMinutes: availableMinutes - totalMinutes,
  };
}
export type FlightEstimate = ReturnType<typeof estimateFlight>;
export function previewPosition(estimate: FlightEstimate, progress: number) {
  if (
    estimate.airspaceBlocked ||
    !estimate.legs.length ||
    !Number.isFinite(estimate.transitMinutes)
  )
    return null;
  let remaining = Math.max(0, Math.min(1, progress)) * estimate.transitMinutes;
  for (const leg of estimate.legs) {
    if (remaining <= leg.minutes || leg === estimate.legs.at(-1)) {
      const fraction = Math.min(1, remaining / leg.minutes);
      const [longitude, latitude] = destination(
        [leg.from.longitude, leg.from.latitude],
        leg.distanceKm * fraction,
        leg.heading,
      ).geometry.coordinates;
      return { latitude, longitude, heading: leg.heading };
    }
    remaining -= leg.minutes;
  }
  return null;
}
