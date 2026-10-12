import {
  AirspaceStatus,
  type Airport,
  type AirspaceDataset,
  type AirspaceAssessment,
  type GeographicLocation,
} from '../entities';
import {
  airportDistance,
  containsLocation,
  coordinatesSchema,
  isSupportedLocation,
} from './geography';
export const isStale = (timestamp: string | null, days = 7, now = Date.now()) =>
  !timestamp ||
  !Number.isFinite(Date.parse(timestamp)) ||
  now - Date.parse(timestamp) > days * 86400000 ||
  Date.parse(timestamp) > now + 60000;
export function nearbyAirports(
  location: GeographicLocation,
  airports: Airport[],
  radiusKm: number,
) {
  coordinatesSchema.parse(location);
  return airports
    .map((a) => ({
      ...a,
      distanceKm: airportDistance(location, a),
      withinAdvisory: false,
    }))
    .filter((a) => a.distanceKm <= 25)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((a) => ({ ...a, withinAdvisory: a.distanceKm <= radiusKm }));
}
export function assessLocation(
  location: GeographicLocation,
  airports: Airport[],
  airspace: AirspaceDataset,
  radiusKm: number,
  now = Date.now(),
): AirspaceAssessment {
  coordinatesSchema.parse(location);
  if (![3, 5, 10].includes(radiusKm))
    throw new Error('Unsupported advisory radius');
  const warnings = [
    'Official airspace coverage is incomplete. No live NOTAM feed is available. This is not flight authorization.',
  ];
  const supported = isSupportedLocation(location);
  if (!supported)
    warnings.push(
      'Outside the supported Philippine region. This application cannot assess airspace here.',
    );
  const restrictions = activeVerifiedZones(airspace.zones, now).filter((z) =>
    containsLocation(z, location),
  );
  if (
    airspace.zones.some(
      (z) =>
        z.effectiveUntil &&
        Date.parse(z.effectiveUntil) <= now &&
        containsLocation(z, location),
    )
  )
    warnings.push(
      'Expired zone records intersect this point. Check the latest official publication.',
    );
  for (const zone of restrictions) {
    if (isStale(zone.verifiedAt, 28, now))
      warnings.push(zone.name + ': source verification is older than 28 days.');
    warnings.push(
      zone.name +
        ': altitude applicability (' +
        zone.altitudeReference +
        ') and operating conditions require official verification.',
    );
  }
  if (!airports.length)
    warnings.push(
      'Airport data is unavailable or empty. Nearby facilities may be missing.',
    );
  if (airports.some((a) => isStale(a.updatedAt, 7, now)))
    warnings.push(
      'Some airport records are older than 7 days. Check data freshness.',
    );
  const nearby = nearbyAirports(location, airports, radiusKm);
  const priority = [
    AirspaceStatus.PROHIBITED,
    AirspaceStatus.RESTRICTED,
    AirspaceStatus.CONTROLLED,
    AirspaceStatus.AIRPORT_ADVISORY,
  ];
  const status = supported
    ? (priority.find((s) => restrictions.some((z) => z.category === s)) ??
      AirspaceStatus.UNKNOWN)
    : AirspaceStatus.UNKNOWN;
  return {
    location,
    status,
    nearbyAirports: nearby,
    restrictions,
    airportAdvisory: nearby.some((a) => a.withinAdvisory),
    dataComplete: false,
    warnings,
    checkedAt: new Date(now).toISOString(),
  };
}

export function activeVerifiedZones(
  zones: import('../entities').AirspaceZone[],
  now = Date.now(),
) {
  return zones.filter(
    (z) =>
      z.verificationStatus === 'verified' &&
      Date.parse(z.effectiveFrom) <= now &&
      (!z.effectiveUntil || Date.parse(z.effectiveUntil) > now),
  );
}
