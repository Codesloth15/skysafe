import { CircleMarker, Popup } from 'react-leaflet';
import { useEstablishments } from '../../hooks/data';
import { useExplorer } from '../../../app/store/use-explorer';
import type { MapBounds } from '../../../domain/entities';

export const establishmentLabels = {
  military: 'Military installation',
  police: 'Police station',
  prison: 'Prison',
};

export default function EstablishmentMarkers({
  bounds,
}: {
  bounds: MapBounds;
}) {
  const { data = [] } = useEstablishments();
  const select = useExplorer((state) => state.select);
  return data
    .filter(
      (item) =>
        item.latitude >= bounds.south &&
        item.latitude <= bounds.north &&
        item.longitude >= bounds.west &&
        item.longitude <= bounds.east,
    )
    .map((item) => (
      <CircleMarker
        key={item.id}
        center={[item.latitude, item.longitude]}
        radius={8}
        pathOptions={{
          color: '#be123c',
          fillColor: '#be123c',
          fillOpacity: 0.75,
          weight: 2,
        }}
      >
        <Popup>
          <strong>{item.name}</strong>
          <p>{establishmentLabels[item.type]} · Sensitive establishment</p>
          <p>
            Check flight restrictions and required authorization before flying
            here. OSM locations are reference points, not verified no-fly
            boundaries.
          </p>
          <p>
            <a href={item.sourceReference} target="_blank" rel="noreferrer">
              OpenStreetMap source
            </a>
          </p>
          <button onClick={() => select(item, item.name)}>
            Check this location
          </button>
        </Popup>
      </CircleMarker>
    ));
}
