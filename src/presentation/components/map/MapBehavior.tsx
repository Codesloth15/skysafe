import { useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import { useExplorer } from '../../../app/store/use-explorer';
import type { MapBounds } from '../../../domain/entities';
export default function MapBehavior({
  onViewport,
}: {
  onViewport: (bounds: MapBounds, zoom: number) => void;
}) {
  const target = useExplorer((s) => s.target);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const map = useMapEvents({
    click: (e) =>
      useExplorer
        .getState()
        .select({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
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
        Math.max(map.getZoom(), 11),
        { duration: 1.1 },
      );
  }, [target, map]);
  return null;
}
