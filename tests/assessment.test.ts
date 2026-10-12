import { describe, it, expect } from 'vitest';
import { assessLocation, isStale } from '../src/domain/services/assessment';
import { emptyAirspace } from '../src/infrastructure/adapters/geojson';
import { airport, zone, now } from './fixtures';
describe('Location assessment', () => {
  it('does not infer permission from missing zones or missing airports', () => {
    const result = assessLocation(airport, [], emptyAirspace(), 5, now);
    expect(result.status).toBe('UNKNOWN');
    expect(result.dataComplete).toBe(false);
    expect(result.warnings.join(' ')).toContain('unavailable');
  });
  it('keeps airport proximity separate from regulatory status', () => {
    const result = assessLocation(airport, [airport], emptyAirspace(), 5, now);
    expect(result.status).toBe('UNKNOWN');
    expect(result.airportAdvisory).toBe(true);
    expect(result.nearbyAirports[0].distanceKm).toBe(0);
  });
  it('updates advisory detection when radius changes', () => {
    const point = { latitude: 14.035, longitude: 121 };
    expect(
      assessLocation(point, [airport], emptyAirspace(), 3, now).airportAdvisory,
    ).toBe(false);
    expect(
      assessLocation(point, [airport], emptyAirspace(), 5, now).airportAdvisory,
    ).toBe(true);
  });
  it('applies the highest priority while preserving overlapping zones', () => {
    const result = assessLocation(
      airport,
      [airport],
      {
        ...emptyAirspace(),
        zones: [zone, { ...zone, id: 'prohibited', category: 'PROHIBITED' }],
      },
      5,
      now,
    );
    expect(result.status).toBe('PROHIBITED');
    expect(result.restrictions).toHaveLength(2);
    expect(result.dataComplete).toBe(false);
  });
  it('excludes future, expired and unverified records', () => {
    const zones = [
      { ...zone, effectiveFrom: '2027-01-01T00:00:00Z' },
      { ...zone, effectiveUntil: '2026-10-11T00:00:00Z' },
      { ...zone, verificationStatus: 'unverified' as const },
    ];
    const result = assessLocation(
      airport,
      [airport],
      { ...emptyAirspace(), zones },
      5,
      now,
    );
    expect(result.status).toBe('UNKNOWN');
    expect(result.restrictions).toHaveLength(0);
    expect(result.warnings.join(' ')).toContain('Expired');
  });
  it('warns about altitude applicability and stale source verification', () => {
    const result = assessLocation(
      airport,
      [{ ...airport, updatedAt: '2020-01-01T00:00:00Z' }],
      {
        ...emptyAirspace(),
        zones: [{ ...zone, verifiedAt: '2020-01-01T00:00:00Z' }],
      },
      5,
      now,
    );
    expect(result.warnings.join(' ')).toContain('altitude applicability');
    expect(result.warnings.join(' ')).toContain('older than 28 days');
    expect(result.warnings.join(' ')).toContain('older than 7 days');
  });
  it('uses UNKNOWN for unsupported regions', () => {
    expect(
      assessLocation(
        { latitude: 51, longitude: 0 },
        [airport],
        emptyAirspace(),
        5,
        now,
      ).status,
    ).toBe('UNKNOWN');
  });
  it('handles invalid, future and old timestamps conservatively', () => {
    expect(isStale(null, 7, now)).toBe(true);
    expect(isStale('not a date', 7, now)).toBe(true);
    expect(isStale('2030-01-01T00:00:00Z', 7, now)).toBe(true);
    expect(isStale(new Date(now).toISOString(), 7, now)).toBe(false);
  });
});
