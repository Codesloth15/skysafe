import { useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet';
import { featureCollection, feature } from '@turf/turf';
import AirportClusterMarkers from './AirportClusterMarkers';
import MapBehavior from './MapBehavior';
import MapControls from './MapControls';
import { activeVerifiedZones } from '../../../domain/services/assessment';
import { useExplorer } from '../../../app/store/use-explorer';
import { useCombinedAirports, useAirspace, useClock } from '../../hooks/data';
import { advisoryCircle } from '../../../domain/services/geography';
import {
  DEFAULT_MAP,
  COLORS,
  satelliteAvailable,
} from '../../../shared/constants/map';
import type { MapBounds } from '../../../domain/entities';
export default function MapView({ onLayers }: { onLayers: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ bounds: MapBounds; zoom: number }>(
    { bounds: { south: 4, west: 116, north: 22, east: 127 }, zoom: 6 },
  );
  const [tileError, setTileError] = useState(false);
  const { airports, isPending, error } = useCombinedAirports();
  const { data: airspace } = useAirspace();
  const clock = useClock();
  const { layers, radius, selected, basemap } = useExplorer();
  const updateViewport = useMemo(
    () => (bounds: MapBounds, zoom: number) => setViewport({ bounds, zoom }),
    [],
  );
  const inView = useMemo(
    () =>
      airports.filter(
        (a) =>
          a.latitude >= viewport.bounds.south - 0.2 &&
          a.latitude <= viewport.bounds.north + 0.2 &&
          a.longitude >= viewport.bounds.west - 0.2 &&
          a.longitude <= viewport.bounds.east + 0.2,
      ),
    [airports, viewport.bounds],
  );
  const visible = useMemo(
    () =>
      inView.filter((a) =>
        a.type === 'heliport' ? layers.heliports : layers.airports,
      ),
    [inView, layers.airports, layers.heliports],
  );
  const circles = useMemo(
    () =>
      featureCollection(
        inView
          .filter((a) => a.type !== 'closed')
          .slice(0, 100)
          .map((a) => advisoryCircle(a, radius)),
      ),
    [inView, radius],
  );
  const zoneFeatures = useMemo(
    () =>
      featureCollection(
        activeVerifiedZones(airspace?.zones ?? [], clock)
          .filter(
            (z) =>
              (
                ({
                  PROHIBITED: layers.prohibited,
                  RESTRICTED: layers.restricted,
                  CONTROLLED: layers.controlled,
                  AIRPORT_ADVISORY: layers.advisory,
                }) as Record<string, boolean>
              )[z.category],
          )
          .map((z) =>
            feature(z.geometry, { name: z.name, category: z.category }),
          ),
      ),
    [airspace, layers, clock],
  );
  const satellite = basemap === 'satellite' && satelliteAvailable;
  return (
    <div
      className={'leaflet-frame ' + (satellite ? 'satellite' : 'street')}
      ref={frame}
    >
      <MapContainer
        center={DEFAULT_MAP.center}
        zoom={DEFAULT_MAP.zoom}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        preferCanvas
        attributionControl
      >
        <TileLayer
          key={satellite ? 'satellite' : 'street'}
          url={
            satellite
              ? import.meta.env.VITE_SATELLITE_URL
              : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution={
            satellite
              ? import.meta.env.VITE_SATELLITE_ATTRIBUTION
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <MapBehavior onViewport={updateViewport} />
        <MapControls onLayers={onLayers} frame={frame} />
        {layers.proximity && viewport.zoom >= 8 && (
          <GeoJSON
            key={'circles-' + radius + '-' + inView.map((a) => a.id).join(',')}
            data={circles}
            style={{
              color: '#eab308',
              weight: 1.2,
              fillColor: '#facc15',
              fillOpacity: 0.1,
              dashArray: '5 5',
            }}
            interactive={false}
          />
        )}
        <GeoJSON
          key={JSON.stringify(zoneFeatures)}
          data={zoneFeatures}
          style={(f) => ({
            color: COLORS[f?.properties?.category] ?? '#64748b',
            fillOpacity: 0.2,
            weight: 2,
          })}
          onEachFeature={(f, layer) => {
            const node = document.createElement('span');
            node.textContent = f.properties?.name ?? 'Airspace zone';
            layer.bindTooltip(node);
          }}
        />
        <AirportClusterMarkers airports={visible} zoom={viewport.zoom} />
        {selected && (
          <>
            <CircleMarker
              center={[selected.latitude, selected.longitude]}
              radius={18}
              pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.12 }}
            />
            <CircleMarker
              center={[selected.latitude, selected.longitude]}
              radius={6}
              pathOptions={{
                color: 'white',
                weight: 2,
                fillColor: '#2563eb',
                fillOpacity: 1,
              }}
            />
          </>
        )}
      </MapContainer>
      {(isPending || error || tileError) && (
        <div
          className={'map-data-state ' + (error ? 'error' : '')}
          role="status"
        >
          {isPending
            ? 'Loading airport reference data…'
            : error
              ? 'Airport data unavailable. Check the source panel and retry.'
              : 'Map tiles could not load. Airport data remains available.'}
        </div>
      )}
      <details className="map-legend">
        <summary>
          <span className="legend-dot blue" />
          Map legend
        </summary>
        <div>
          <span>
            <i style={{ background: '#2563eb' }} />
            Airport
          </span>
          <span>
            <i style={{ background: '#0891b2' }} />
            Heliport
          </span>
          <span>
            <i style={{ background: '#eab308' }} />
            Proximity advisory
          </span>
          <span>
            <i style={{ background: '#ef4444' }} />
            Prohibited
          </span>
          <span>
            <i style={{ background: '#f97316' }} />
            Restricted
          </span>
          <span>
            <i style={{ background: '#a855f7' }} />
            Controlled
          </span>
          <span>
            <i style={{ background: '#64748b' }} />
            Unknown
          </span>
          <small>
            Green is reserved for adequately verified coverage; it is not used
            in this MVP.
          </small>
        </div>
      </details>
      {layers.proximity && (
        <div className="ring-note">
          {radius} km distance indicators ·{' '}
          {viewport.zoom < 8 ? 'zoom in to view rings' : 'advisory only'}
        </div>
      )}
    </div>
  );
}
