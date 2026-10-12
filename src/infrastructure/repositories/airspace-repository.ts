import type { IAirspaceRepository } from '../../domain/repositories';
import { parseAirspaceGeoJSON } from '../adapters/geojson';
import { request } from '../api/http';
export class GeoJSONAirspaceRepository implements IAirspaceRepository {
  async getZones(signal?: AbortSignal) {
    return parseAirspaceGeoJSON(
      await request('/data/restricted-zones.geojson', { signal }),
    );
  }
}
