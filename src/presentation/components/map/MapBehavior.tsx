import { useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import { useExplorer } from '../../../app/store/use-explorer';
import type { MapBounds } from '../../../domain/entities';
import { useFlightPlan } from '../../../app/store/use-flight-plan';
import { toast } from 'sonner';
export default function MapBehavior({
  onViewport,
}: {
  onViewport: (bounds: MapBounds, zoom: number) => void;
}) {
  const target = useExplorer((s) => s.target);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const map = useMapEvents({
    click: (e) => {
      const point = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      const plan = useFlightPlan.getState();
      if (plan.active && plan.drawing) {
        if (!plan.addPoint(point))
          toast.info(
            useFlightPlan.getState().actionError ??
              'Choose a distinct point within the Philippine region (maximum 30 waypoints).',
          );
      } else useExplorer.getState().select(point);
    },
    moveend: update,
    zoomend: update,
  });
  function update() {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      const b = map.getBounds();
      onViewport(
        {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        },
        map.getZoom(),
      );
    }, 200);
  }
  useEffect(() => {
    const b = map.getBounds();
    onViewport(
      {
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      },
      map.getZoom(),
    );
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
      clearTimeout(timeout.current);
    };
  }, [map, onViewport]);
  useEffect(() => {
    if (target)
      map.flyTo(
        [target.latitude, target.longitude],
        Math.max(map.getZoom(), target.zoom ?? 11),
        { duration: 1.1 },
      );
  }, [target, map]);
  return null;
}
