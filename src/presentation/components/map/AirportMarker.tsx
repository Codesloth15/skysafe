import { memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Airport } from '../../../domain/entities';
import { useExplorer } from '../../../app/store/use-explorer';
const airportIcon = L.divIcon({
  className: 'aviation-marker',
  html: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m21 3-6 18-4-8-8-4z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
const heliportIcon = L.divIcon({
  className: 'aviation-marker heliport-marker',
  html: '<span aria-hidden="true">H</span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});
const closedIcon = L.divIcon({
  className: 'aviation-marker closed-marker',
  html: '<span aria-hidden="true">×</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
export default memo(function AirportMarker({ airport }: { airport: Airport }) {
  return (
    <Marker
      position={[airport.latitude, airport.longitude]}
      icon={
        airport.type === 'heliport'
          ? heliportIcon
          : airport.type === 'closed'
            ? closedIcon
            : airportIcon
      }
      title={airport.name}
      alt={airport.name}
    >
      <Popup>
        <div className="airport-popup">
          <div className="eyebrow">{airport.type.replaceAll('_', ' ')}</div>
          <strong>{airport.name}</strong>
          <p>
            {airport.icaoCode ?? 'No ICAO'} · {airport.iataCode ?? 'No IATA'}
          </p>
          <p>
            {airport.latitude.toFixed(5)}, {airport.longitude.toFixed(5)}
          </p>
          <button
            onClick={() => useExplorer.getState().select(airport, airport.name)}
          >
            Inspect this airport
          </button>
          <a href={airport.sourceReference} target="_blank" rel="noreferrer">
            {airport.source} ↗
          </a>
          <small>Location reference only. Verify operating conditions.</small>
        </div>
      </Popup>
    </Marker>
  );
});
