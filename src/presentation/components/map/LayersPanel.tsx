import { X, Layers, Info } from 'lucide-react';
import {
  useExplorer,
  type Layers as LayerState,
} from '../../../app/store/use-explorer';
import { useAirspace, useClock } from '../../hooks/data';
import { activeVerifiedZones } from '../../../domain/services/assessment';
import { satelliteAvailable } from '../../../shared/constants/map';
const rows: {
  key: keyof LayerState;
  label: string;
  color: string;
  category?: string;
}[] = [
  { key: 'airports', label: 'Airports', color: '#2563eb' },
  { key: 'heliports', label: 'Heliports', color: '#0891b2' },
  { key: 'proximity', label: 'Airport proximity', color: '#eab308' },
  {
    key: 'prohibited',
    label: 'Verified prohibited zones',
    color: '#ef4444',
    category: 'PROHIBITED',
  },
  {
    key: 'restricted',
    label: 'Verified restricted zones',
    color: '#f97316',
    category: 'RESTRICTED',
  },
  {
    key: 'controlled',
    label: 'Controlled airspace',
    color: '#a855f7',
    category: 'CONTROLLED',
  },
  {
    key: 'advisory',
    label: 'Verified advisory areas',
    color: '#eab308',
    category: 'AIRPORT_ADVISORY',
  },
];
export default function LayersPanel({ onClose }: { onClose: () => void }) {
  const { layers, setLayer, radius, setRadius, basemap, setBasemap } =
    useExplorer();
  const { data } = useAirspace();
  const clock = useClock();
  return (
    <section className="layers-panel card" aria-label="Map layer controls">
      <div className="panel-heading">
        <h2>
          <Layers size={17} />
          Map layers
        </h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close map layers"
        >
          <X size={18} />
        </button>
      </div>
      <div className="basemap-options">
        <button
          className={basemap === 'street' ? 'selected' : ''}
          onClick={() => setBasemap('street')}
        >
          Street map
        </button>
        <button
          className={basemap === 'satellite' ? 'selected' : ''}
          disabled={!satelliteAvailable}
          title={
            !satelliteAvailable
              ? 'No licensed satellite service configured'
              : undefined
          }
          onClick={() => setBasemap('satellite')}
        >
          Satellite {!satelliteAvailable && '· unavailable'}
        </button>
      </div>
      {rows.map((row) => {
        const available =
          !row.category ||
          activeVerifiedZones(data?.zones ?? [], clock).some(
            (z) => z.category === row.category,
          );
        return (
          <label
            className={'layer-row ' + (!available ? 'unavailable' : '')}
            key={row.key}
          >
            <span className="layer-swatch" style={{ background: row.color }} />
            <span>
              {row.label}
              {!available && <small>No active verified data loaded</small>}
            </span>
            <input
              type="checkbox"
              checked={layers[row.key]}
              disabled={!available}
              onChange={(e) => setLayer(row.key, e.target.checked)}
            />
          </label>
        );
      })}
      <div className="radius-picker">
        <div className="eyebrow">ADVISORY RADIUS</div>
        <div className="segmented">
          {([3, 5, 10] as const).map((r) => (
            <button
              key={r}
              aria-pressed={radius === r}
              className={radius === r ? 'selected' : ''}
              onClick={() => setRadius(r)}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>
      <p className="layer-explanation">
        <Info size={15} />
        Distance rings are visual indicators, not legal no-fly boundaries.
      </p>
    </section>
  );
}
