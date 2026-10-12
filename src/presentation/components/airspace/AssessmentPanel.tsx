import { useState } from 'react';
import {
  ShieldQuestion,
  MapPin,
  Plane,
  Navigation,
  Bookmark,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useExplorer } from '../../../app/store/use-explorer';
import {
  useAssessment,
  useCombinedAirports,
  useAirspace,
} from '../../hooks/data';
import { isStale } from '../../../domain/services/assessment';
import { errorMessage } from '../../../infrastructure/api/http';
import Notice from '../common/Notice';
import { COLORS } from '../../../shared/constants/map';
export default function AssessmentPanel() {
  const { selected, selectionName, radius, save } = useExplorer();
  const { result, loading, airportError, airspaceError, retry } =
    useAssessment();
  const airports = useCombinedAirports();
  const airspace = useAirspace();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  function saveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (save(name.trim())) {
      setSaving(false);
      toast.success('Location saved in this browser');
    } else
      toast.error(
        'Enter a name of up to 100 characters. You can save up to 100 locations.',
      );
  }
  return (
    <aside
      className={'assessment-panel ' + (expanded ? 'expanded' : '')}
      aria-label="Location assessment"
    >
      <button
        className="sheet-handle"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span />
        {selected ? 'Selected location' : 'Location assessment'}
        {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      <div className="assessment-scroll">
        <div className="panel-top">
          <div className="eyebrow">YOUR PRE-FLIGHT PERSPECTIVE</div>
          <h2>Location assessment</h2>
          <p>A better understanding of what’s around you.</p>
        </div>
        {!selected ? (
          <div className="select-empty">
            <div className="radar-graphic">
              <span />
              <span />
              <MapPin size={31} />
            </div>
            <h3>
              Start with a point
              <br />
              on the map.
            </h3>
            <p>
              Search for a place or click anywhere to review nearby airports and
              available airspace information.
            </p>
            <div className="hint">
              <Navigation size={14} />
              Select a location to get started
            </div>
          </div>
        ) : (
          <>
            <div className="selected-location">
              <div className="eyebrow">
                <MapPin size={13} /> SELECTED LOCATION
              </div>
              <h3>{selectionName}</h3>
              <div className="coordinates">
                {selected.latitude.toFixed(5)}°, {selected.longitude.toFixed(5)}
                °
              </div>
            </div>
            {loading && (
              <div className="assessment-skeleton" role="status">
                <span />
                <span />
                <span />
                Loading aviation reference data…
              </div>
            )}
            {(airportError || airspaceError) && (
              <Notice tone="error">
                {airportError && (
                  <p>Airport dataset: {errorMessage(airportError)}</p>
                )}
                {airspaceError && (
                  <p>Restriction dataset: {errorMessage(airspaceError)}</p>
                )}
                <p>
                  Assessment is incomplete. Data failures cannot establish
                  permission to fly.
                </p>
                <button onClick={retry}>Retry data loading</button>
              </Notice>
            )}
            {result && !loading && (
              <>
                <div
                  className="assessment-status"
                  style={{ borderLeftColor: COLORS[result.status] }}
                >
                  <ShieldQuestion size={24} />
                  <div>
                    <strong>
                      {result.status === 'UNKNOWN'
                        ? 'Not yet verified'
                        : result.status.replaceAll('_', ' ')}
                    </strong>
                    <span>
                      {result.status === 'UNKNOWN'
                        ? 'Insufficient official airspace data'
                        : 'Mapped airspace intersects this location'}
                    </span>
                  </div>
                </div>
                <p className="assessment-description">
                  This location has not been confirmed as unrestricted. Review
                  official CAAP information before flight.
                </p>
                {result.airportAdvisory && (
                  <Notice>
                    <strong>Airport proximity advisory</strong>
                    <p>
                      This point is within a {radius} km visual distance ring.
                      Verify applicable operating conditions and authorization.
                    </p>
                  </Notice>
                )}
                <div className="section-heading">
                  <span>NEARBY AIRPORTS</span>
                  <span>{result.nearbyAirports.length} within 25 km</span>
                </div>
                <div className="nearby-list">
                  {result.nearbyAirports.slice(0, 8).map((a) => (
                    <div
                      className={
                        'airport-item ' + (a.withinAdvisory ? 'within' : '')
                      }
                      key={a.id}
                    >
                      <div className="airport-symbol">
                        {a.type === 'heliport' ? (
                          <span>H</span>
                        ) : (
                          <Plane size={17} />
                        )}
                      </div>
                      <div className="airport-text">
                        <a
                          href={a.sourceReference}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.name}
                        </a>
                        <small>
                          {a.icaoCode ?? a.iataCode ?? 'No identifier'} ·{' '}
                          {a.type.replaceAll('_', ' ')}
                        </small>
                        <small>
                          {a.source}
                          {a.withinAdvisory
                            ? ' · within ' + radius + ' km'
                            : ''}
                        </small>
                      </div>
                      <div className="airport-distance">
                        {a.distanceKm < 0.05 ? '<0.1' : a.distanceKm.toFixed(1)}
                        <small>km</small>
                      </div>
                    </div>
                  ))}
                  {!result.nearbyAirports.length && (
                    <div className="nearby-empty">
                      No loaded airports within 25 km. Unmapped facilities may
                      still exist.
                    </div>
                  )}
                </div>
                <div className="section-heading">
                  <span>OFFICIAL AIRSPACE</span>
                  <span className="coverage-badge">Incomplete</span>
                </div>
                {!result.restrictions.length ? (
                  <p className="muted">
                    No active verified zones are mapped at this point. This is
                    not evidence of unrestricted airspace.
                  </p>
                ) : (
                  result.restrictions.map((z) => (
                    <details className="zone-details" key={z.id}>
                      <summary>
                        {z.name} · {z.category.replaceAll('_', ' ')}
                      </summary>
                      <p>{z.description}</p>
                      <p>
                        Altitude: {z.lowerAltitude ?? 'Unspecified'} to{' '}
                        {z.upperAltitude ?? 'Unspecified'}{' '}
                        {z.altitudeReference === 'FL' ? 'flight level' : 'm'}{' '}
                        {z.altitudeReference}
                      </p>
                      <p>
                        Published:{' '}
                        {new Date(z.publicationDate).toLocaleDateString(
                          'en-PH',
                        )}
                      </p>
                      <p>
                        Effective: {z.effectiveFrom} to{' '}
                        {z.effectiveUntil ?? 'until superseded'}
                      </p>
                      <a href={z.sourceUrl} target="_blank" rel="noreferrer">
                        {z.authority} · source ↗
                      </a>
                    </details>
                  ))
                )}
                <details className="limitations">
                  <summary>
                    <AlertTriangle size={14} />
                    Assessment limitations
                  </summary>
                  {result.warnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </details>
                {saving ? (
                  <form className="save-form" onSubmit={saveLocation}>
                    <label htmlFor="favorite-name">Location name</label>
                    <input
                      id="favorite-name"
                      autoFocus
                      maxLength={100}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <div className="actions">
                      <button className="button primary" type="submit">
                        <Check size={16} />
                        Save location
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setSaving(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="button primary save-location"
                    onClick={() => {
                      setName(
                        selectionName === 'Selected location'
                          ? ''
                          : selectionName,
                      );
                      setSaving(true);
                    }}
                  >
                    <Bookmark size={16} />
                    Save this location
                  </button>
                )}
              </>
            )}
          </>
        )}
        <div className="source-summary">
          <div className="section-heading">
            <span>DATA TRANSPARENCY</span>
            <Check size={14} />
          </div>
          {airports.data?.sources.map((source) => (
            <div className="source-item" key={source.name}>
              <span
                className={
                  'source-dot ' +
                  (isStale(source.importedAt) || source.status === 'stale'
                    ? 'warning'
                    : 'available')
                }
              />
              <div>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.name}
                  <ArrowUpRight size={12} />
                </a>
                <small>
                  {source.importedAt
                    ? 'Imported ' +
                      new Date(source.importedAt).toLocaleDateString('en-PH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'No import available'}
                  {isStale(source.importedAt) || source.status === 'stale'
                    ? ' · outdated'
                    : ''}
                </small>
              </div>
            </div>
          ))}
          <div className="source-item">
            <span className="source-dot missing" />
            <div>
              <span>Official regulatory coverage</span>
              <small>
                {airspace.data?.zones.length
                  ? 'Partial authorized imports'
                  : 'Not yet available'}{' '}
                · NOTAMs not connected
              </small>
            </div>
          </div>
        </div>
        <div className="regulatory-note">
          <ShieldQuestion size={17} />
          <p>
            SkySafe is an informational planning tool, not an aviation
            authority. Always confirm conditions, permits, and current NOTAMs.
          </p>
        </div>
        <a
          className="official-link"
          href="https://ais.caap.gov.ph/"
          target="_blank"
          rel="noreferrer"
        >
          Review official CAAP information
          <ArrowUpRight size={15} />
        </a>
      </div>
    </aside>
  );
}
