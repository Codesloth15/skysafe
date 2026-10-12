import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bookmark,
  MapPin,
  ArrowUpRight,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useExplorer } from '../../app/store/use-explorer';
import type { SavedLocation } from '../../domain/entities';
import { toast } from 'sonner';
function FavoriteCard({ location }: { location: SavedLocation }) {
  const { select, remove, rename } = useExplorer();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const [deleting, setDeleting] = useState(false);
  function open() {
    select(location, location.name, true);
    navigate('/explore');
  }
  return (
    <article className="favorite-card card">
      <div className="favorite-map">
        <MapPin size={30} />
        <span>
          {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
        </span>
      </div>
      <div className="favorite-content">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              rename(location.id, name.trim());
              setEditing(false);
            }}
          >
            <label className="sr-only" htmlFor={'name-' + location.id}>
              Location name
            </label>
            <input
              id={'name-' + location.id}
              maxLength={100}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button aria-label="Save location name">
              <Check size={18} />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              onClick={() => setEditing(false)}
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <h2>{location.name}</h2>
        )}
        <p>Saved {new Date(location.createdAt).toLocaleDateString('en-PH')}</p>
        <span className="coverage-badge">Requires a fresh airspace check</span>
        <div className="favorite-actions">
          <button className="text-link" onClick={open}>
            Explore location
            <ArrowUpRight size={16} />
          </button>
          <div>
            <button
              className="icon-button"
              aria-label={'Rename ' + location.name}
              onClick={() => setEditing(true)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={'Delete ' + location.name}
              onClick={() => setDeleting(!deleting)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {deleting && (
          <div className="delete-confirm">
            <span>Delete this saved location?</span>
            <button
              onClick={() => {
                remove(location.id);
                toast.success('Location deleted');
              }}
            >
              Delete
            </button>
            <button onClick={() => setDeleting(false)}>Keep</button>
          </div>
        )}
      </div>
    </article>
  );
}
export default function Saved() {
  const favorites = useExplorer((s) => s.favorites);
  return (
    <div className="content-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR PLACES / LOCAL TO THIS BROWSER</div>
          <h1>Worth coming back to.</h1>
          <p>
            Your saved locations, ready for another look. Saving a location does
            not confirm flight permission.
          </p>
        </div>
        <span className="count-badge">{favorites.length} saved</span>
      </div>
      {favorites.length ? (
        <div className="favorites-grid">
          {favorites.map((f) => (
            <FavoriteCard key={f.id} location={f} />
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <Bookmark size={40} />
          <h2>Your next perspective starts here.</h2>
          <p>
            Save a point from the map to keep it in this browser. No account
            needed.
          </p>
          <Link className="button primary" to="/explore">
            Explore the map
          </Link>
        </div>
      )}
      <p className="page-footnote">
        Saved locations stay on this device. Clearing browser storage removes
        them.
      </p>
    </div>
  );
}
