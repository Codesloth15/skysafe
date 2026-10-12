import type { IAirportRepository } from '../../domain/repositories';
import {
  airportDatasetSchema,
  validateAirportDataset,
} from '../adapters/airports';
import { readStored, writeStored } from '../cache/storage';
import { request } from '../api/http';
export class StaticAirportRepository implements IAirportRepository {
  async getAll(signal?: AbortSignal) {
    try {
      const data = validateAirportDataset(
        await request('/data/airports.json', { signal }),
      );
      writeStored('airport-cache', data);
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      const cached = readStored(
        'airport-cache',
        airportDatasetSchema.nullable(),
        null,
      );
      if (!cached) throw error;
      return {
        ...cached,
        sources: cached.sources.map((s) => ({
          ...s,
          status: 'stale' as const,
          message:
            'Static data could not be loaded; showing the last browser-cached snapshot.',
        })),
      };
    }
  }
}
