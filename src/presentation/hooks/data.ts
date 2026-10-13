import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { services } from '../../app/services';
import { useExplorer } from '../../app/store/use-explorer';
import { deduplicateAirports } from '../../domain/services/geography';
import { emptyAirspace } from '../../infrastructure/adapters/geojson';
import type { Airport, SensitiveEstablishment } from '../../domain/entities';
export const useEstablishments = () =>
  useQuery<SensitiveEstablishment[]>({
    queryKey: ['osm-establishments'],
    queryFn: () => [],
    enabled: false,
    initialData: [],
  });
export function useClock() {
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return clock;
}
export const useAirports = () =>
  useQuery({
    queryKey: ['airports'],
    queryFn: ({ signal }) => services.airports.execute(signal),
    staleTime: 3600000,
  });
export const useAirspace = () =>
  useQuery({
    queryKey: ['airspace'],
    queryFn: ({ signal }) => services.airspace.execute(signal),
    staleTime: 300000,
  });
export function useCombinedAirports() {
  const query = useAirports();
  const supplement = useQuery<Airport[]>({
    queryKey: ['osm-supplement'],
    queryFn: () => [],
    enabled: false,
    initialData: [],
  });
  const airports = useMemo(
    () =>
      deduplicateAirports([
        ...(query.data?.airports ?? []),
        ...(supplement.data ?? []),
      ]),
    [query.data, supplement.data],
  );
  return { ...query, airports };
}
export function useAssessment() {
  const { selected, radius } = useExplorer();
  const airports = useCombinedAirports();
  const airspace = useAirspace();
  const clock = useClock();
  const result = useMemo(
    () =>
      selected
        ? services.check.execute(
            selected,
            airports.airports,
            airspace.data ?? emptyAirspace(),
            radius,
            clock,
          )
        : null,
    [selected, airports.airports, airspace.data, radius, clock],
  );
  return {
    result,
    loading: airports.isPending || airspace.isPending,
    airportError: airports.error,
    airspaceError: airspace.error,
    retry: () => {
      airports.refetch();
      airspace.refetch();
    },
  };
}
