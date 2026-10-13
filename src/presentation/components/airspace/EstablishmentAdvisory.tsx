import { useEstablishments } from '../../hooks/data';
import { airportDistance } from '../../../domain/services/geography';
import type { GeographicLocation } from '../../../domain/entities';
import { isStale } from '../../../domain/services/assessment';
import Notice from '../common/Notice';
import LocationFocusButton from '../common/LocationFocusButton';

export default function EstablishmentAdvisory({
  location,
  onFocus,
}: {
  location: GeographicLocation;
  onFocus?: () => void;
}) {
  const { data = [] } = useEstablishments();
  const nearby = data
    .map((item) => ({ ...item, distanceKm: airportDistance(location, item) }))
    .filter((item) => item.distanceKm <= 25)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return (
    <section aria-label="Sensitive establishments">
      <div className="section-heading">
        <span>SENSITIVE ESTABLISHMENTS</span>
        <span>{nearby.length} within 25 km</span>
      </div>
      {nearby.length > 0 ? (
        <>
          <Notice>
            <strong>Check restrictions before flying</strong>
            <p>
              Military bases, police stations, and prisons are mapped nearby.
              Confirm applicable restrictions and authorization with the
              relevant authority. Distances are to OSM reference points, not
              site boundaries.
            </p>
          </Notice>
          <div className="nearby-list">
            {nearby.slice(0, 8).map((item) => (
              <div className="airport-item" key={item.id}>
                <div className="airport-text">
                  <LocationFocusButton
                    location={item}
                    name={item.name}
                    onFocus={onFocus}
                  />
                  <small>
                    {item.type === 'military'
                      ? 'Military installation'
                      : item.type === 'police'
                        ? 'Police station'
                        : 'Prison'}{' '}
                    · OpenStreetMap
                  </small>
                  {isStale(item.updatedAt) && (
                    <small>Outdated record — refresh and verify</small>
                  )}
                </div>
                <div className="airport-distance">
                  {item.distanceKm < 0.05 ? '<0.1' : item.distanceKm.toFixed(1)}
                  <small>km</small>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">
          No loaded sensitive establishments within 25 km. Zoom in and select
          “Load nearby OSM” to check military bases, police stations, and
          prisons around the map center. Coverage is incomplete.
        </p>
      )}
    </section>
  );
}
