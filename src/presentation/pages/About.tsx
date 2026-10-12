import {
  ArrowUpRight,
  Compass,
  ShieldQuestion,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useCombinedAirports, useAirspace } from '../hooks/data';
import { isStale } from '../../domain/services/assessment';
import Notice from '../components/common/Notice';
import { errorMessage } from '../../infrastructure/api/http';
export default function About() {
  const airports = useCombinedAirports();
  const airspace = useAirspace();
  const heliports = airports.airports.filter(
    (a) => a.type === 'heliport',
  ).length;
  return (
    <div className="content-page about-page">
      <div className="about-hero">
        <span className="brand-icon">
          <Compass size={34} />
        </span>
        <div className="eyebrow">A CLEARER VIEW BEFORE TAKEOFF</div>
        <h1>Know Before You Fly.</h1>
        <p>
          SkySafe gives Philippine drone pilots a practical starting point for
          understanding nearby aviation features. Every flight deserves an
          informed first step.
        </p>
      </div>
      <Notice>
        <strong>Information is not authorization.</strong>
        <p>
          SkySafe is not an aviation authority. An empty map does not mean an
          area is unrestricted. Verify applicable rules, current NOTAMs, and
          permissions with CAAP before every flight.
        </p>
      </Notice>
      <div className="about-stats">
        <div className="card">
          <Database size={22} />
          <strong>{airports.isPending ? '—' : airports.airports.length}</strong>
          <span>Airport reference records</span>
        </div>
        <div className="card">
          <Compass size={22} />
          <strong>{airports.isPending ? '—' : heliports}</strong>
          <span>Heliport records included</span>
        </div>
        <div className="card">
          <ShieldQuestion size={22} />
          <strong>Incomplete</strong>
          <span>Official airspace coverage</span>
        </div>
      </div>
      <section className="card about-section">
        <h2>Know your sources</h2>
        {airports.isPending && (
          <p role="status">Loading dataset information…</p>
        )}
        {airports.error && (
          <Notice tone="error">
            {errorMessage(airports.error)}
            <button onClick={() => airports.refetch()}>Retry airports</button>
          </Notice>
        )}
        {airports.data?.sources.map((source) => (
          <article className="source-detail" key={source.name}>
            <div>
              <h3>{source.name}</h3>
              <span
                className={
                  'data-badge ' +
                  (isStale(source.importedAt) || source.status === 'stale'
                    ? 'warning'
                    : '')
                }
              >
                {isStale(source.importedAt) || source.status === 'stale'
                  ? 'Outdated / cached'
                  : 'Reference data loaded'}
              </span>
            </div>
            <p>{source.message}</p>
            <p>{source.attribution}</p>
            <small>
              Imported:{' '}
              {source.importedAt
                ? new Date(source.importedAt).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                    timeZoneName: 'short',
                  })
                : 'Not available'}
            </small>
            <a href={source.url} target="_blank" rel="noreferrer">
              View data source
              <ArrowUpRight size={15} />
            </a>
          </article>
        ))}
        <article className="source-detail">
          <div>
            <h3>Official regulatory airspace</h3>
            <span className="coverage-badge">Incomplete</span>
          </div>
          <p>
            {airspace.error
              ? 'Restriction dataset failed to load. No regulatory assessment can be completed.'
              : (airspace.data?.source.message ??
                'Loading source information…')}
          </p>
          <p>
            No live NOTAM feed is connected. Airport circles represent distances
            only. They do not describe official airspace boundaries.
          </p>
          <a href="https://ais.caap.gov.ph/" target="_blank" rel="noreferrer">
            CAAP Aeronautical Information Service
            <ExternalLink size={15} />
          </a>
        </article>
      </section>
      <section className="card about-section">
        <h2>Built for a useful first check</h2>
        <div className="about-features">
          <div>
            <h3>Real reference data</h3>
            <p>
              OurAirports is prepared at build time. Additional local aerodromes
              and heliports can be requested explicitly from Overpass when
              zoomed in.
            </p>
          </div>
          <div>
            <h3>Honest uncertainty</h3>
            <p>
              Locations without sufficient verified regulatory data remain
              unknown, including locations near an airport. Proximity is shown
              as a separate advisory.
            </p>
          </div>
          <div>
            <h3>Your browser, your places</h3>
            <p>
              Favorites and preferences are stored on this device. Search uses
              Photon / OpenStreetMap; map tiles are provided by OpenStreetMap.
            </p>
          </div>
        </div>
        <a
          className="text-link"
          href="https://github.com/komoot/photon#demo-server"
          target="_blank"
          rel="noreferrer"
        >
          Photon service terms
          <ArrowUpRight size={15} />
        </a>
      </section>
    </div>
  );
}
