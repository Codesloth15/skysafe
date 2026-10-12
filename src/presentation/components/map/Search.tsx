import { looksLikeCoordinates } from '../../../application/use-cases';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  MapPin,
  Clock,
  X,
  LoaderCircle,
  Plane,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCombinedAirports } from '../../hooks/data';
import { services } from '../../../app/services';
import { useExplorer } from '../../../app/store/use-explorer';
import type { SearchResult } from '../../../domain/entities';
export default function Search() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const { airports } = useCombinedAirports();
  const { recent, select, remember } = useExplorer();
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setActive(-1);
    }, 650);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  const results = useQuery({
    queryKey: ['search', query, airports.length],
    queryFn: ({ signal }) => services.search.execute(query, airports, signal),
    enabled: !!query,
    staleTime: 86400000,
    retry: false,
  });
  const items = query ? (results.data?.results ?? []) : recent;
  function choose(result: SearchResult) {
    select(result, result.name, true);
    remember(result);
    setInput('');
    setQuery('');
    setOpen(false);
    navigate('/explore');
  }
  return (
    <div className="search" ref={root}>
      <SearchIcon size={19} />
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls="location-results"
        aria-autocomplete="list"
        aria-activedescendant={
          active >= 0 ? 'search-option-' + active : undefined
        }
        aria-label="Search locations"
        placeholder="Search a place, airport, or coordinates"
        value={input}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          }
          if (e.key === 'Enter' && items.length) {
            e.preventDefault();
            choose(items[Math.max(0, active)]);
          }
        }}
      />
      {input ? (
        <button
          aria-label="Clear search"
          onClick={() => {
            setInput('');
            setQuery('');
          }}
        >
          <X size={16} />
        </button>
      ) : (
        <kbd>/</kbd>
      )}
      {open && (
        <div className="search-popover">
          <div className="eyebrow">
            {query ? 'SEARCH RESULTS' : 'RECENT SEARCHES'}
          </div>
          {results.isFetching && query && (
            <p className="search-progress" role="status">
              <LoaderCircle size={15} className="spin" /> Finding locations…
            </p>
          )}
          <div
            id="location-results"
            role="listbox"
            aria-label="Location suggestions"
          >
            {items.map((r, i) => (
              <button
                role="option"
                aria-selected={i === active}
                id={'search-option-' + i}
                className={i === active ? 'highlight' : ''}
                key={r.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
              >
                {!query ? (
                  <Clock size={17} />
                ) : r.kind === 'airport' ? (
                  <Plane size={17} />
                ) : (
                  <MapPin size={17} />
                )}
                <span>
                  {r.name}
                  <small>{r.detail}</small>
                </span>
              </button>
            ))}
          </div>
          {!items.length && !results.isFetching && (
            <p>
              {query
                ? 'No matches. Try a city, municipality, province, airport, or latitude, longitude.'
                : 'Search Philippine places and airports, or enter latitude, longitude.'}
            </p>
          )}
          {results.data?.warning && (
            <p className="search-warning">{results.data.warning}</p>
          )}
          {looksLikeCoordinates(query) && !items.length && (
            <p className="search-warning">
              Use valid latitude (−90 to 90), longitude (−180 to 180).
            </p>
          )}
          <div className="search-footer">
            Place results: Photon / OpenStreetMap · Airport results: loaded
            reference data
          </div>
        </div>
      )}
    </div>
  );
}
