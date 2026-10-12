import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  LocateFixed,
  Maximize,
  Minimize,
  Plus,
  Minus,
  Globe,
  LoaderCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useExplorer } from '../../../app/store/use-explorer';
import { deduplicateAirports } from '../../../domain/services/geography';
import { services } from '../../../app/services';
import { errorMessage } from '../../../infrastructure/api/http';
import type { Airport } from '../../../domain/entities';
export default function MapControls({
  onLayers,
  frame,
}: {
  onLayers: () => void;
  frame: React.RefObject<HTMLDivElement>;
}) {
  const map = useMap();
  const client = useQueryClient();
  const [locating, setLocating] = useState(false);
  const [osmBusy, setOsmBusy] = useState(false);
  const [full, setFull] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const osmRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    for (const node of [toolsRef.current, osmRef.current])
      if (node) {
        L.DomEvent.disableClickPropagation(node);
        L.DomEvent.disableScrollPropagation(node);
      }
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const listener = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', listener);
    return () => {
      document.removeEventListener('fullscreenchange', listener);
      client.cancelQueries({ queryKey: ['osm-area'] });
    };
  }, [client]);
  function locate() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        useExplorer.getState().select(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          'Current location',
          true,
        );
        setLocating(false);
      },
      (error) => {
        if (!mounted.current) return;
        toast.error(
          error.code === 1
            ? 'Location permission was denied. You can search or select a point manually.'
            : 'Your location could not be determined. Try again.',
        );
        setLocating(false);
      },
      { timeout: 12000, maximumAge: 60000 },
    );
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.current?.parentElement?.requestFullscreen)
        await frame.current.parentElement.requestFullscreen();
      else toast.info('Fullscreen is unavailable in this browser.');
    } catch {
      toast.error('Fullscreen could not be opened.');
    }
  }
  async function loadOSM() {
    if (map.getZoom() < 10) {
      toast.info('Zoom in to level 10 or closer to load nearby OSM features.');
      return;
    }
    const c = map.getCenter();
    const bounds = {
      south: Number((c.lat - 0.15).toFixed(2)),
      west: Number((c.lng - 0.15).toFixed(2)),
      north: Number((c.lat + 0.15).toFixed(2)),
      east: Number((c.lng + 0.15).toFixed(2)),
    };
    setOsmBusy(true);
    try {
      const data = await client.fetchQuery({
        queryKey: ['osm-area', bounds],
        queryFn: ({ signal }) => services.overpass.getArea(bounds, signal),
        staleTime: 86400000,
        retry: false,
      });
      client.setQueryData<Airport[]>(['osm-supplement'], (old) =>
        deduplicateAirports([...(old ?? []), ...data]),
      );
      toast.success('Loaded ' + data.length + ' OSM features for this area.');
    } catch (error) {
      toast.error(
        errorMessage(error) + ' Prepared airport data remains available.',
      );
    } finally {
      if (mounted.current) setOsmBusy(false);
    }
  }
  return (
    <>
      <div className="map-tools" ref={toolsRef}>
        <button title="Map layers" aria-label="Map layers" onClick={onLayers}>
          <Layers size={19} />
        </button>
        <button
          title="Use current location"
          aria-label="Use current location"
          onClick={locate}
          disabled={locating}
        >
          {locating ? (
            <LoaderCircle className="spin" size={19} />
          ) : (
            <LocateFixed size={19} />
          )}
        </button>
        <button
          title="Toggle fullscreen map"
          aria-label="Toggle fullscreen map"
          onClick={fullscreen}
        >
          {full ? <Minimize size={19} /> : <Maximize size={19} />}
        </button>
        <span className="tool-separator" />
        <button aria-label="Zoom in" onClick={() => map.zoomIn()}>
          <Plus size={20} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.zoomOut()}>
          <Minus size={20} />
        </button>
      </div>
      <button
        className="osm-button"
        ref={osmRef}
        onClick={loadOSM}
        disabled={osmBusy}
        title="Explicitly load aerodromes and heliports in a 0.3° area around the map center"
      >
        {osmBusy ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Globe size={15} />
        )}
        <span>{osmBusy ? 'Loading OSM…' : 'Load nearby OSM'}</span>
      </button>
    </>
  );
}
