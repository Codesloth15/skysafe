import { useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Airport } from '../../../domain/entities';
import { clusterAirports } from '../../view-models/airport-clusters';
import AirportMarker from './AirportMarker';
export default function AirportClusterMarkers({
  airports,
  zoom,
}: {
  airports: Airport[];
  zoom: number;
}) {
  const map = useMap();
  const clusters = useMemo(
    () => clusterAirports(airports, zoom),
    [airports, zoom],
  );
  return (
    <>
      {clusters.map((cluster) =>
        cluster.airports.length === 1 ? (
          <AirportMarker
            key={cluster.airports[0].id}
            airport={cluster.airports[0]}
          />
        ) : (
          <Marker
            key={cluster.id}
            position={[cluster.latitude, cluster.longitude]}
            title={'Explore ' + cluster.airports.length + ' airport references'}
            alt={'Explore ' + cluster.airports.length + ' airport references'}
            icon={L.divIcon({
              className: 'airport-cluster',
              html: '<span>' + cluster.airports.length + '</span>',
              iconSize: [35, 35],
              iconAnchor: [17.5, 17.5],
            })}
            eventHandlers={{
              click: () =>
                map.flyTo(
                  [cluster.latitude, cluster.longitude],
                  Math.min(11, zoom + 2),
                  { duration: 0.7 },
                ),
            }}
          />
        ),
      )}
    </>
  );
}
