import { z } from 'zod';
import type { GeographicLocation } from '../../domain/entities';
import type { Wind } from '../../domain/services/flight-plan';
import { request } from '../api/http';

const nullableNumber = z.number().finite().nullable();
const forecastSchema = z.object({
  hourly: z.object({
    time: z.array(z.number().finite()),
    wind_speed_10m: z.array(nullableNumber),
    wind_direction_10m: z.array(nullableNumber),
    wind_gusts_10m: z.array(nullableNumber),
  }),
});
export interface WindForecast {
  hourly: z.infer<typeof forecastSchema>['hourly'];
  fetchedAt: number;
}
export async function getWindForecast(
  point: GeographicLocation,
  signal?: AbortSignal,
): Promise<WindForecast> {
  const params = new URLSearchParams({
    latitude: point.latitude.toFixed(3),
    longitude: point.longitude.toFixed(3),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'ms',
    timeformat: 'unixtime',
    timezone: 'UTC',
    forecast_days: '7',
  });
  const parsed = forecastSchema.parse(
    await request('https://api.open-meteo.com/v1/forecast?' + params, {
      signal,
    }),
  );
  return { ...parsed, fetchedAt: Date.now() };
}
export function windForDeparture(
  forecast: WindForecast,
  departure: number,
  minutes: number,
): Wind {
  if (!Number.isFinite(departure))
    throw new Error('Choose a valid departure date and time.');
  const { hourly } = forecast;
  const start = Math.floor(departure / 3600000) * 3600;
  const end = Math.floor((departure + minutes * 60000) / 3600000) * 3600;
  const samples: Wind[] = [];
  for (let time = start; time <= end; time += 3600) {
    const i = hourly.time.indexOf(time);
    const speed = hourly.wind_speed_10m[i],
      direction = hourly.wind_direction_10m[i],
      gust = hourly.wind_gusts_10m[i];
    if (
      i < 0 ||
      speed == null ||
      direction == null ||
      gust == null ||
      speed < 0 ||
      gust < 0 ||
      direction < 0 ||
      direction > 360
    )
      throw new Error(
        'Wind data is unavailable for this departure. Choose a time within the next 7 days or enter manual wind.',
      );
    samples.push({
      speedMps: speed,
      fromDegrees: direction,
      gustMps: Math.max(speed, gust),
    });
  }
  const strongest = samples.reduce((a, b) =>
    a.speedMps >= b.speedMps ? a : b,
  );
  return {
    ...strongest,
    gustMps: Math.max(...samples.map((sample) => sample.gustMps)),
  };
}
