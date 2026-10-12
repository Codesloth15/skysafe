import type { Airport, AirspaceZone } from '../src/domain/entities';
export const now = Date.parse('2026-10-12T12:00:00Z');
export const airport: Airport = {
  id: 'test-airport',
  name: 'Synthetic test airport',
  type: 'small_airport',
  latitude: 14,
  longitude: 121,
  source: 'Test fixture',
  sourceReference: 'https://example.com/test',
  updatedAt: new Date(now).toISOString(),
};
export const zone: AirspaceZone = {
  id: 'test-zone',
  name: 'Synthetic test polygon — not real airspace',
  category: 'RESTRICTED',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [120, 13],
        [122, 13],
        [122, 15],
        [120, 15],
        [120, 13],
      ],
    ],
  },
  authority: 'Test fixture only',
  description: 'Synthetic geometry for automated testing.',
  sourceUrl: 'https://example.com/test',
  publicationDate: '2026-10-01T00:00:00Z',
  effectiveFrom: '2026-10-01T00:00:00Z',
  effectiveUntil: null,
  lowerAltitude: 0,
  upperAltitude: 100,
  altitudeReference: 'AGL',
  verificationStatus: 'verified',
  verifiedAt: '2026-10-12T00:00:00Z',
};
