import { describe, it, expect } from 'vitest';
import { clusterAirports } from '../src/presentation/view-models/airport-clusters';
import { airport } from './fixtures';
describe('Map display clustering', () => {
  it('retains all records while grouping close points at national scale', () => {
    const records = [
      airport,
      { ...airport, id: 'nearby', latitude: 14.01 },
      { ...airport, id: 'distant', latitude: 20, longitude: 125 },
    ];
    const clusters = clusterAirports(records, 6);
    expect(clusters.reduce((sum, c) => sum + c.airports.length, 0)).toBe(3);
    expect(clusters.some((c) => c.airports.length === 2)).toBe(true);
  });
  it('shows individual airport markers from zoom level 10', () => {
    expect(
      clusterAirports([airport, { ...airport, id: 'nearby' }], 10),
    ).toHaveLength(2);
  });
});
