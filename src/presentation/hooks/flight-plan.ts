import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFlightPlan } from '../../app/store/use-flight-plan';
import {
  departureTimestamp,
  estimateFlight,
} from '../../domain/services/flight-plan';
import {
  getWindForecast,
  windForDeparture,
} from '../../infrastructure/repositories/wind-repository';
import { useAirspace } from './data';

export function useFlightEstimate() {
  const active = useFlightPlan((s) => s.active);
  const points = useFlightPlan((s) => s.points);
  const settings = useFlightPlan((s) => s.settings);
  const {
    data: airspace,
    error: airspaceError,
    refetch: retryAirspace,
  } = useAirspace();
  const start = points[0];
  const key = start
    ? `${start.latitude.toFixed(3)},${start.longitude.toFixed(3)}`
    : '';
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    const timeout = setTimeout(() => setSettled(key), 500);
    return () => clearTimeout(timeout);
  }, [key]);
  const forecast = useQuery({
    queryKey: ['planning-wind', key],
    queryFn: ({ signal }) => getWindForecast(start, signal),
    enabled:
      active &&
      !!start &&
      key === settled &&
      settings.windSource === 'forecast',
    staleTime: 600000,
    retry: false,
  });
  const departure = departureTimestamp(settings.departure);
  const { wind, windError } = useMemo(() => {
    if (settings.windSource === 'manual')
      return { wind: settings.manualWind, windError: null };
    if (forecast.data && !forecast.isError) {
      try {
        return {
          wind: windForDeparture(
            forecast.data,
            departure,
            settings.durationMinutes,
          ),
          windError: null,
        };
      } catch (error) {
        return {
          wind: null,
          windError:
            error instanceof Error ? error.message : 'Wind unavailable',
        };
      }
    }
    return { wind: null, windError: forecast.error?.message ?? null };
  }, [
    settings.windSource,
    settings.manualWind,
    settings.durationMinutes,
    forecast.data,
    forecast.isError,
    forecast.error,
    departure,
  ]);
  const estimate = useMemo(
    () => estimateFlight(points, settings, wind, airspace?.zones),
    [points, settings, wind, airspace],
  );
  useEffect(() => {
    useFlightPlan.getState().setForecastWind(wind);
  }, [wind]);
  return {
    estimate,
    wind,
    windError: settings.windSource === 'forecast' ? windError : null,
    loadingWind:
      settings.windSource === 'forecast' &&
      !!start &&
      (forecast.isFetching || key !== settled),
    refreshWind: () => forecast.refetch(),
    fetchedAt: forecast.data?.fetchedAt,
    departure,
    airspaceError,
    retryAirspace,
  };
}
