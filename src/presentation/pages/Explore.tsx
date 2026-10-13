import { MapPin, ArrowUpRight } from 'lucide-react';
import MapView from '../components/map/MapView';
import AssessmentPanel from '../components/airspace/AssessmentPanel';
import LayersPanel from '../components/map/LayersPanel';
import { useEffect, useState } from 'react';
import { useAirspace } from '../hooks/data';
import { useFlightPlan } from '../../app/store/use-flight-plan';
import FlightPlannerPanel from '../components/airspace/FlightPlannerPanel';
export default function Explore({ checker = false }: { checker?: boolean }) {
  const [layersOpen, setLayersOpen] = useState(false);
  const { active, setActive } = useFlightPlan();
  const airspace = useAirspace();
  useEffect(() => {
    useFlightPlan
      .getState()
      .setAirspace(
        airspace.data?.zones ?? [],
        airspace.isError ? 'error' : airspace.isPending ? 'loading' : 'ready',
      );
  }, [airspace.data, airspace.isError, airspace.isPending]);
  return (
    <div className="explore-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PHILIPPINES / AIRSPACE INTELLIGENCE</div>
          <h1>
            {checker
              ? 'Location checker'
              : 'A little awareness. A better flight.'}
          </h1>
          <p>
            {checker
              ? 'Select a location to review nearby airports and available airspace information.'
              : 'Explore the airspace. Understand your surroundings. Know before you fly.'}
          </p>
        </div>
        <a
          href="https://ais.caap.gov.ph/"
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          CAAP AIS <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="explorer-modebar" aria-label="Map mode">
        <button aria-pressed={!active} onClick={() => setActive(false)}>
          <MapPin size={15} />
          Inspect location
        </button>
        <button
          aria-pressed={active}
          onClick={() => {
            setLayersOpen(false);
            setActive(true);
          }}
        >
          <img src="/icons/dji-fpv.svg" alt="" width="24" height="24" />
          Plan flight
        </button>
      </div>
      <div className="explorer-grid">
        <section
          className="map-frame"
          aria-label="Interactive Philippine airspace map"
        >
          <MapView onLayers={() => setLayersOpen(!layersOpen)} />
          {layersOpen && <LayersPanel onClose={() => setLayersOpen(false)} />}
          <div className="map-caption">
            <MapPin size={14} />
            <span>Click anywhere on the map to inspect a location</span>
          </div>
        </section>
        {active ? <FlightPlannerPanel /> : <AssessmentPanel />}
      </div>
    </div>
  );
}
