import { AirspaceStatus } from '../../domain/entities';
export const DEFAULT_MAP = {
  center: [12.8797, 121.774] as [number, number],
  zoom: 6,
};
export const COLORS: Record<string, string> = {
  [AirspaceStatus.PROHIBITED]: '#ef4444',
  [AirspaceStatus.RESTRICTED]: '#f97316',
  [AirspaceStatus.CONTROLLED]: '#a855f7',
  [AirspaceStatus.AIRPORT_ADVISORY]: '#eab308',
  [AirspaceStatus.NO_KNOWN_RESTRICTION]: '#22c55e',
  [AirspaceStatus.UNKNOWN]: '#64748b',
};
export const satelliteAvailable = Boolean(
  import.meta.env.VITE_SATELLITE_URL &&
  import.meta.env.VITE_SATELLITE_ATTRIBUTION,
);
