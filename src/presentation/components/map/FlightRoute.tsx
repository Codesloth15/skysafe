import { Fragment, useEffect, useMemo } from 'react';
import { destination } from '@turf/turf';
import { Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { useFlightPlan } from '../../../app/store/use-flight-plan';
import { useFlightEstimate } from '../../hooks/flight-plan';
import { previewPosition } from '../../../domain/services/flight-plan';

const waypointIcon = (index: number) =>
  L.divIcon({
    className: 'flight-waypoint',
    html: `<span>${index === 0 ? 'S' : index}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
export default function FlightRoute() {
  const map = useMap();
  const {
    points,
    drawing,
    movePoint,
    progress,
    playing,
    fitRequest,
    settings,
    validationError,
  } = useFlightPlan();
  const { estimate, wind } = useFlightEstimate();
  const renderer = useMemo(() => L.svg(), []);
  const position = validationError ? null : previewPosition(estimate, progress);
  const droneIcon = useMemo(
    () =>
      L.divIcon({
        className: 'flight-drone',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        html: `<img src="/icons/dji-fpv.svg" alt="" style="transform:rotate(${position?.heading ?? 0}deg)" />`,
      }),
    [position?.heading],
  );
  useEffect(() => {
    if (
      !playing ||
      estimate.blocked ||
      estimate.airspaceBlocked ||
      validationError
    )
      return;
    const timer = setInterval(() => {
      const state = useFlightPlan.getState();
      const next = Math.min(1, state.progress + 0.005);
      useFlightPlan.setState({ progress: next, playing: next < 1 });
    }, 100);
    return () => clearInterval(timer);
  }, [playing, estimate.blocked, estimate.airspaceBlocked, validationError]);
  useEffect(() => {
    if (!fitRequest) return;
    const route = useFlightPlan.getState().points;
    if (route.length)
      map.fitBounds(
        L.latLngBounds(route.map((p) => [p.latitude, p.longitude])),
        { padding: [60, 70], maxZoom: 16 },
      );
  }, [fitRequest, map]);
  return (
    <>
      {estimate.legs.map((leg, index) => {
        const color =
          leg.zoneNames.length ||
          estimate.windExceeded ||
          !Number.isFinite(leg.minutes)
            ? '#ef4444'
            : leg.cumulativeMinutes + settings.overheadMinutes >
                estimate.availableMinutes
              ? '#f59e0b'
              : '#06b6d4';
        const positions: [number, number][] = [
          [leg.from.latitude, leg.from.longitude],
          [leg.to.latitude, leg.to.longitude],
        ];
        const previousMinutes = index
          ? estimate.legs[index - 1].cumulativeMinutes
          : 0;
        const fraction = Math.max(
          0,
          Math.min(
            1,
            (estimate.availableMinutes -
              settings.overheadMinutes -
              previousMinutes) /
              leg.minutes,
          ),
        );
        const withinBudget =
          color === '#f59e0b' && fraction > 0 && fraction < 1
            ? destination(
                [leg.from.longitude, leg.from.latitude],
                leg.distanceKm * fraction,
                leg.heading,
              ).geometry.coordinates
            : null;
        return (
          <Fragment key={index}>
            <Polyline
              positions={positions}
              renderer={renderer}
              interactive={false}
              pathOptions={{
                color,
                weight: 4,
                opacity: 0.9,
                dashArray: leg.returning ? '8 9' : undefined,
                className: 'flight-route-line',
              }}
            />
            {withinBudget && (
              <Polyline
                positions={[positions[0], [withinBudget[1], withinBudget[0]]]}
                renderer={renderer}
                interactive={false}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 4,
                  opacity: 0.95,
                  dashArray: leg.returning ? '8 9' : undefined,
                  className: 'flight-budget-line',
                }}
              />
            )}
          </Fragment>
        );
      })}
      {points.map((point, index) => (
        <Marker
          key={index}
          position={[point.latitude, point.longitude]}
          icon={waypointIcon(index)}
          draggable={drawing}
          bubblingMouseEvents={false}
          title={index === 0 ? 'Route start' : `Waypoint ${index}`}
          alt={index === 0 ? 'Route start' : `Waypoint ${index}`}
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target as L.Marker;
              const next = marker.getLatLng();
              if (
                !movePoint(index, { latitude: next.lat, longitude: next.lng })
              ) {
                marker.setLatLng([point.latitude, point.longitude]);
                toast.error(
                  useFlightPlan.getState().actionError ??
                    'Choose a point within the supported Philippine region.',
                );
              }
            },
          }}
        >
          <Tooltip>
            {index === 0 ? 'Start / return' : `Waypoint ${index}`}
            {drawing ? ' · drag to adjust' : ''}
          </Tooltip>
        </Marker>
      ))}
      {position && (
        <Marker
          position={[position.latitude, position.longitude]}
          icon={droneIcon}
          interactive={false}
          zIndexOffset={1200}
          title="DJI FPV route preview"
          alt="DJI FPV route preview"
        >
          <Tooltip>
            Simulated position{wind ? '' : ' · calm-air baseline'}
          </Tooltip>
        </Marker>
      )}
    </>
  );
}
