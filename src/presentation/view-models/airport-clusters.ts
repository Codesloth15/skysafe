import type { Airport } from '../../domain/entities';
export interface AirportCluster {
  id: string;
  latitude: number;
  longitude: number;
  airports: Airport[];
}
/** Screen-grid clustering uses Web Mercator pixels; cluster positions are display-only. */
export function clusterAirports(
  airports: Airport[],
  zoom: number,
): AirportCluster[] {
  if (zoom >= 10)
    return airports.map((a) => ({
      id: a.id,
      latitude: a.latitude,
      longitude: a.longitude,
      airports: [a],
    }));
  const size = 256 * 2 ** zoom;
  const buckets = new Map<string, Airport[]>();
  for (const airport of airports) {
    const sin = Math.sin(
      (Math.max(-85, Math.min(85, airport.latitude)) * Math.PI) / 180,
    );
    const x = ((airport.longitude + 180) / 360) * size;
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size;
    const key = Math.floor(x / 48) + ':' + Math.floor(y / 48);
    const bucket = buckets.get(key) ?? [];
    bucket.push(airport);
    buckets.set(key, bucket);
  }
  return [...buckets].map(([id, items]) => ({
    id,
    latitude: items.reduce((sum, a) => sum + a.latitude, 0) / items.length,
    longitude: items.reduce((sum, a) => sum + a.longitude, 0) / items.length,
    airports: items,
  }));
}
