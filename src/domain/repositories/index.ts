import type {
  AirportDataset,
  AirspaceDataset,
  MapBounds,
  Airport,
  SearchResult,
} from '../entities';
export interface IAirportRepository {
  getAll(signal?: AbortSignal): Promise<AirportDataset>;
}
export interface IAirspaceRepository {
  getZones(signal?: AbortSignal): Promise<AirspaceDataset>;
}
export interface IGeocodingRepository {
  search(query: string, signal?: AbortSignal): Promise<SearchResult[]>;
}
export interface ISupplementaryAirportRepository {
  getArea(bounds: MapBounds, signal?: AbortSignal): Promise<Airport[]>;
}
