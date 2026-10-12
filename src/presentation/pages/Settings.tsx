import { useExplorer } from '../../app/store/use-explorer';
import {
  Sun,
  Moon,
  SlidersHorizontal,
  Trash2,
  Monitor,
  Globe,
} from 'lucide-react';
import { satelliteAvailable } from '../../shared/constants/map';
import Notice from '../components/common/Notice';
import { toast } from 'sonner';
export default function Settings() {
  const {
    theme,
    setTheme,
    radius,
    setRadius,
    basemap,
    setBasemap,
    recent,
    clearRecent,
  } = useExplorer();
  return (
    <div className="content-page narrow">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Workspace settings</h1>
          <p>Your preferences stay in this browser.</p>
        </div>
        <SlidersHorizontal size={30} />
      </div>
      <section className="settings-card card">
        <h2>
          <Monitor size={20} />
          Appearance
        </h2>
        <p>Choose the interface that feels right for your flight planning.</p>
        <div className="settings-options">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={theme === t}
              className={theme === t ? 'selected' : ''}
              onClick={() => setTheme(t)}
            >
              {t === 'light' ? <Sun size={21} /> : <Moon size={21} />}
              <span>{t === 'light' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="settings-card card">
        <h2>
          <Globe size={20} />
          Map preferences
        </h2>
        <label>Default advisory radius</label>
        <div className="segmented">
          {([3, 5, 10] as const).map((r) => (
            <button
              key={r}
              className={radius === r ? 'selected' : ''}
              aria-pressed={radius === r}
              onClick={() => setRadius(r)}
            >
              {r} km
            </button>
          ))}
        </div>
        <p>
          Distance circles are visual proximity indicators. They are not
          official legal restrictions.
        </p>
        <label htmlFor="basemap-select">Base map</label>
        <select
          id="basemap-select"
          value={
            basemap === 'satellite' && !satelliteAvailable ? 'street' : basemap
          }
          onChange={(e) => setBasemap(e.target.value as 'street' | 'satellite')}
        >
          <option value="street">Street map · OpenStreetMap</option>
          <option value="satellite" disabled={!satelliteAvailable}>
            Satellite{' '}
            {satelliteAvailable ? '' : '· no licensed service configured'}
          </option>
        </select>
      </section>
      <section className="settings-card card">
        <h2>
          <Trash2 size={20} />
          Local data
        </h2>
        <p>
          Favorites, recent searches, map layers, and theme preferences are
          stored locally. No user account or database is used.
        </p>
        <button
          className="button"
          disabled={!recent.length}
          onClick={() => {
            clearRecent();
            toast.success('Recent search history cleared');
          }}
        >
          Clear recent searches ({recent.length})
        </button>
      </section>
      <Notice tone="info">
        Place searches and map tile requests are sent to their respective public
        providers. Your precise location is only requested when you press the
        current-location button.
      </Notice>
    </div>
  );
}
