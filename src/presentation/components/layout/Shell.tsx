import { NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  Map,
  MapPin,
  Bookmark,
  Info,
  Settings,
  Sun,
  Moon,
  ArrowUpRight,
  ShieldQuestion,
  PanelLeftClose,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useExplorer } from '../../../app/store/use-explorer';
import { useAirports } from '../../hooks/data';
import { isStale } from '../../../domain/services/assessment';
import Search from '../map/Search';
import Notice from '../common/Notice';
const links = [
  { to: '/explore', label: 'Explore Map', icon: Map },
  { to: '/checker', label: 'Location Checker', icon: MapPin },
  { to: '/saved', label: 'Saved Locations', icon: Bookmark },
  { to: '/about', label: 'About SkySafe', icon: Info },
  { to: '/settings', label: 'Settings', icon: Settings },
];
export default function Shell({ children }: { children: ReactNode }) {
  const { theme, setTheme, storageError } = useExplorer();
  const { data, error } = useAirports();
  const location = useLocation();
  const [compact, setCompact] = useState(false);
  const fresh = data && !isStale(data.importedAt);
  return (
    <div className={'app-shell ' + (compact ? 'compact' : '')}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="SkySafe home">
          <span className="brand-icon">
            <Compass size={26} />
          </span>
          <span>
            SkySafe<small>KNOW BEFORE YOU FLY</small>
          </span>
        </NavLink>
        <div className="sidebar-caption">FLIGHT WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/explore'} title={label}>
              <Icon size={19} />
              <span>{label}</span>
              {to === '/explore' && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldQuestion size={22} />
            <strong>Plan with awareness.</strong>
            <p>A clear map is not clearance to fly. Always verify with CAAP.</p>
            <a href="https://ais.caap.gov.ph/" target="_blank" rel="noreferrer">
              Official aviation information <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="country">
            <span>🇵🇭</span>
            <div>
              Philippines<small>INITIAL COVERAGE</small>
            </div>
            <button
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              onClick={() => setCompact(!compact)}
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Search />
          <div className="topbar-actions">
            <NavLink
              to="/about"
              className={'freshness ' + (fresh ? '' : 'stale')}
              title="Airport reference freshness; official airspace coverage is incomplete"
            >
              <span className="status-dot" />
              <span>
                {error
                  ? 'Airport data unavailable'
                  : fresh
                    ? 'Airport data loaded'
                    : data
                      ? 'Airport data outdated'
                      : 'Loading airport data'}
              </span>
            </NavLink>
            <button
              className="icon-button theme-toggle"
              aria-label={
                theme === 'light'
                  ? 'Switch to dark theme'
                  : 'Switch to light theme'
              }
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
          </div>
        </header>
        {storageError && (
          <Notice tone="error">
            Browser storage is unavailable. Changes will only last for this
            session.
          </Notice>
        )}
        <main id="main" className="main-content" key={location.pathname}>
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/explore'}>
            <Icon size={21} />
            <span>
              {label === 'Location Checker'
                ? 'Check'
                : label === 'Explore Map'
                  ? 'Explore'
                  : label === 'Saved Locations'
                    ? 'Saved'
                    : label === 'About SkySafe'
                      ? 'About'
                      : label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
