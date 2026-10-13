import type { MultiPolygon, Polygon } from 'geojson';
export const AirspaceStatus = {
  PROHIBITED: 'PROHIBITED',
  RESTRICTED: 'RESTRICTED',
  CONTROLLED: 'CONTROLLED',
  AIRPORT_ADVISORY: 'AIRPORT_ADVISORY',
  NO_KNOWN_RESTRICTION: 'NO_KNOWN_RESTRICTION',
  UNKNOWN: 'UNKNOWN',
} as const;
export type AirspaceStatus =
  (typeof AirspaceStatus)[keyof typeof AirspaceStatus];
export interface GeographicLocation {
  latitude: number;
  longitude: number;
}
export interface Airport extends GeographicLocation {
  id: string;
  name: string;
  icaoCode?: string;
  iataCode?: string;
  type: string;
  source: string;
  sourceReference: string;
  updatedAt: string;
}
export type Heliport = Airport & { type: 'heliport' };
export interface SensitiveEstablishment extends GeographicLocation {
  id: string;
  name: string;
  type: 'military' | 'police' | 'prison';
  sourceReference: string;
  updatedAt: string;
}
export interface SupplementaryArea {
  airports: Airport[];
  establishments: SensitiveEstablishment[];
}
export interface DataSource {
  name: string;
  url: string;
  attribution: string;
  importedAt: string | null;
  status: 'available' | 'missing' | 'stale' | 'error';
  message: string;
}
export interface AirportDataset {
  airports: Airport[];
  sources: DataSource[];
  importedAt: string;
}
export interface AirspaceZone {
  id: string;
  name: string;
  category: AirspaceStatus;
  geometry: Polygon | MultiPolygon;
  authority: string;
  description: string;
  sourceUrl: string;
  publicationDate: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  lowerAltitude: number | null;
  upperAltitude: number | null;
  altitudeReference: 'AGL' | 'AMSL' | 'FL' | 'UNKNOWN';
  verificationStatus: 'verified' | 'unverified';
  verifiedAt: string;
}
export interface AirspaceDataset {
  zones: AirspaceZone[];
  source: DataSource;
  coverageComplete: false;
}
export interface NearbyAirport extends Airport {
  distanceKm: number;
  withinAdvisory: boolean;
}
export interface AirspaceAssessment {
  location: GeographicLocation;
  status: AirspaceStatus;
  nearbyAirports: NearbyAirport[];
  restrictions: AirspaceZone[];
  airportAdvisory: boolean;
  dataComplete: false;
  warnings: string[];
  checkedAt: string;
}
export interface SearchResult extends GeographicLocation {
  id: string;
  name: string;
  detail: string;
  kind: 'airport' | 'place' | 'coordinates';
}
export interface SavedLocation extends GeographicLocation {
  id: string;
  name: string;
  createdAt: string;
}
export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}
