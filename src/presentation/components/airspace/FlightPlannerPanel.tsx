import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  LocateFixed,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Scan,
  Wind as WindIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useFlightPlan } from '../../../app/store/use-flight-plan';
import { useExplorer } from '../../../app/store/use-explorer';
import { DJI_FPV, type FlightMode } from '../../../domain/services/flight-plan';
import { useFlightEstimate } from '../../hooks/flight-plan';
import Notice from '../common/Notice';

const minutesLabel = (minutes: number) =>
  Number.isFinite(minutes) ? minutes.toFixed(1) + ' min' : 'Not reachable';
export default function FlightPlannerPanel() {
  const plan = useFlightPlan();
  const {
    estimate,
    wind,
    windError,
    loadingWind,
    refreshWind,
    fetchedAt,
    departure,
    airspaceError,
    retryAirspace,
  } = useFlightEstimate();
  const selected = useExplorer((s) => s.selected);
  const [locating, setLocating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function locateStart() {
    if (!navigator.geolocation) {
      toast.error('Location is unavailable. Pick a start on the map.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        setLocating(false);
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!plan.setStart(point)) {
          toast.error(
            useFlightPlan.getState().actionError ??
              'Your location is outside the supported Philippine region. Pick a start on the map.',
          );
          return;
        }
        useExplorer.getState().select(point, 'Flight start', true, 15);
      },
      () => {
        if (!mounted.current) return;
        setLocating(false);
        toast.error(
          'Could not access your location. You can pick a start on the map.',
        );
      },
      { timeout: 12000, maximumAge: 60000 },
    );
  }
  const hasRoute = estimate.legs.length > 0;
  const settings = plan.settings;
  return (
    <aside
      className={
        'assessment-panel flight-planner ' + (plan.expanded ? 'expanded' : '')
      }
      aria-label="Flight planner"
    >
      <button
        className="sheet-handle"
        aria-label="Flight plan details"
        aria-expanded={plan.expanded}
        onClick={() => plan.setExpanded(!plan.expanded)}
      >
        <span />
        Flight plan · {plan.points.length} points{' '}
        {plan.expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      <div className="assessment-scroll planner-scroll">
        <div className="planner-heading">
          <img
            src="/icons/dji-fpv.svg"
            alt="DJI FPV drone icon"
            width="48"
            height="48"
          />
          <div>
            <h2>Plan your flight</h2>
            <p>DJI FPV · FPV quadcopter</p>
          </div>
        </div>
        {(plan.validationError || plan.actionError) && (
          <Notice tone="error">
            {plan.validationError || plan.actionError}
          </Notice>
        )}
        <div className="planner-start">
          <button
            className="button primary"
            onClick={() => plan.setDrawing(true)}
          >
            <MapPin size={16} />
            {plan.points.length ? 'Edit / add waypoints' : 'Pick start on map'}
          </button>
          <button
            className="button"
            onClick={locateStart}
            disabled={locating || plan.points.length > 0}
          >
            <LocateFixed size={16} />
            {locating ? 'Locating…' : 'Use my location as start'}
          </button>
          {!plan.points.length && selected && (
            <button
              className="button"
              onClick={() => {
                if (!plan.setStart(selected))
                  toast.error(
                    useFlightPlan.getState().actionError ??
                      'Select a point within the Philippine region.',
                  );
              }}
            >
              Use selected location as start
            </button>
          )}
        </div>
        <p className="planner-help">
          Choose a start, then tap the map to add waypoints. Drag numbered
          points while editing. Up to 30 points.
        </p>
        <div className="planner-actions">
          <button
            className="button"
            disabled={!plan.points.length}
            onClick={plan.fit}
          >
            <Scan size={15} />
            Fit route
          </button>
          <button
            className="button"
            disabled={!plan.points.length}
            onClick={() => plan.removePoint(plan.points.length - 1)}
          >
            <RotateCcw size={15} />
            Undo
          </button>
          <button
            className="button"
            disabled={!plan.points.length}
            onClick={plan.clear}
          >
            <Trash2 size={15} />
            Clear
          </button>
        </div>
        <label className="planner-check">
          <input
            type="checkbox"
            checked={settings.returnToStart}
            onChange={(e) => plan.update({ returnToStart: e.target.checked })}
          />
          Include return to start
        </label>
        {!settings.returnToStart && (
          <p className="planner-help">
            One-way estimate. Return flight is excluded.
          </p>
        )}
        <div className="planner-fields">
          <label>
            Drone
            <select value={DJI_FPV.id} onChange={() => {}}>
              <option value="dji-fpv">DJI FPV</option>
            </select>
          </label>
          <label>
            Flight mode
            <select
              value={settings.mode}
              onChange={(e) =>
                plan.update({ mode: e.target.value as FlightMode })
              }
            >
              {Object.entries(DJI_FPV.speeds).map(([mode, speed]) => (
                <option key={mode} value={mode}>
                  {mode} · max {speed} m/s
                </option>
              ))}
            </select>
          </label>
          <label className="planner-wide">
            Departure (Philippines, UTC+8)
            <input
              type="datetime-local"
              value={settings.departure}
              onChange={(e) => plan.update({ departure: e.target.value })}
            />
          </label>
          <label className="planner-wide">
            Flight time budget <strong>{settings.durationMinutes} min</strong>
            <input
              aria-label="Flight time budget"
              type="range"
              min="1"
              max="20"
              value={settings.durationMinutes}
              onChange={(e) =>
                plan.update({ durationMinutes: Number(e.target.value) })
              }
            />
          </label>
          <label className="planner-wide">
            Assumed cruise airspeed <strong>{settings.cruiseMps} m/s</strong>
            <input
              aria-label="Cruise airspeed"
              type="range"
              min="1"
              max={DJI_FPV.speeds[settings.mode]}
              step="0.5"
              value={settings.cruiseMps}
              onChange={(e) =>
                plan.update({ cruiseMps: Number(e.target.value) })
              }
            />
          </label>
        </div>
        {(!Number.isFinite(departure) || departure < Date.now() - 60000) && (
          <Notice>Choose a future departure time to plan your flight.</Notice>
        )}
        <details className="planner-details">
          <summary>Reserve &amp; flight assumptions</summary>
          <label>
            Time reserve: {settings.reservePercent}%
            <input
              aria-label="Time reserve"
              type="range"
              min="10"
              max="50"
              step="5"
              value={settings.reservePercent}
              onChange={(e) =>
                plan.update({ reservePercent: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Takeoff, landing &amp; hover allowance: {settings.overheadMinutes}{' '}
            min
            <input
              aria-label="Takeoff landing and hover allowance"
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={settings.overheadMinutes}
              onChange={(e) =>
                plan.update({ overheadMinutes: Number(e.target.value) })
              }
            />
          </label>
          <p>
            DJI test endurance: about 20 min at 40 km/h without wind. Your{' '}
            {settings.reservePercent}% time reserve leaves{' '}
            {(20 * (1 - settings.reservePercent / 100)).toFixed(1)} min before
            applying your budget. This is not a battery percentage prediction.
            Speed, maneuvers, battery condition and wind change actual
            endurance.
          </p>
          <p>
            Published speed limits: Normal 15, Sport 27, Manual 39 m/s. Wind
            resistance: 13.8 m/s (manual). This ceiling is not a recommended
            operating wind.
          </p>
          <p>
            Constant airspeed and wind are assumed. Terrain, obstacles,
            altitude, signal coverage and vertical flight time are not
            calculated. Routes are planning previews, not DJI autopilot
            missions.
          </p>
          <p>
            Sources: DJI FPV support and DJI FPV User Manual, specifications p.
            61.
          </p>
        </details>
        <div className="planner-wind-heading">
          <WindIcon size={17} />
          <h3>Wind at departure</h3>
        </div>
        <label className="planner-field">
          Wind source
          <select
            value={settings.windSource}
            onChange={(e) =>
              plan.update({
                windSource: e.target.value as 'forecast' | 'manual',
              })
            }
          >
            <option value="forecast">Forecast at start point</option>
            <option value="manual">Manual wind assumption</option>
          </select>
        </label>
        {settings.windSource === 'manual' ? (
          <div className="planner-fields">
            <label>
              Wind speed (m/s)
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={settings.manualWind.speedMps}
                onChange={(e) => {
                  const value = Math.max(
                    0,
                    Math.min(50, Number(e.target.value)),
                  );
                  plan.update({
                    manualWind: {
                      ...settings.manualWind,
                      speedMps: value,
                      gustMps: Math.max(value, settings.manualWind.gustMps),
                    },
                  });
                }}
              />
            </label>
            <label>
              Wind from (°)
              <input
                type="number"
                min="0"
                max="359"
                value={settings.manualWind.fromDegrees}
                onChange={(e) =>
                  plan.update({
                    manualWind: {
                      ...settings.manualWind,
                      fromDegrees: Math.max(
                        0,
                        Math.min(359, Number(e.target.value)),
                      ),
                    },
                  })
                }
              />
            </label>
            <label>
              Gusts (m/s)
              <input
                type="number"
                min={settings.manualWind.speedMps}
                max="60"
                step="0.5"
                value={settings.manualWind.gustMps}
                onChange={(e) =>
                  plan.update({
                    manualWind: {
                      ...settings.manualWind,
                      gustMps: Math.max(
                        settings.manualWind.speedMps,
                        Math.min(60, Number(e.target.value)),
                      ),
                    },
                  })
                }
              />
            </label>
            <p className="planner-help">
              0° = from north, 90° = from east. Manual values are assumptions,
              not a forecast.
            </p>
          </div>
        ) : (
          <div className="planner-weather" role="status">
            {!plan.points.length ? (
              <p>Set a start point to load the forecast.</p>
            ) : loadingWind ? (
              <p>Loading wind forecast…</p>
            ) : windError ? (
              <p>{windError}</p>
            ) : wind ? (
              <p>
                <strong>{wind.speedMps.toFixed(1)} m/s</strong> from{' '}
                {Math.round(wind.fromDegrees)}° · gusts{' '}
                {wind.gustMps.toFixed(1)} m/s
              </p>
            ) : (
              <p>Wind data not available.</p>
            )}
            {!!plan.points.length && (
              <button
                className="button"
                disabled={loadingWind}
                onClick={() => void refreshWind()}
              >
                Refresh wind
              </button>
            )}
            <small>
              Open-Meteo · 10 m wind at the start · strongest hourly sample
              across your budget. Wind along the route and at flying altitude
              can differ.
              {fetchedAt
                ? ' Retrieved ' +
                  new Date(fetchedAt).toLocaleTimeString('en-PH', {
                    timeZone: 'Asia/Manila',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) +
                  ' PHT.'
                : ''}
            </small>
          </div>
        )}
        <div
          className="planner-summary"
          aria-label="Route estimate"
          aria-live="polite"
        >
          <div>
            <span>Route distance</span>
            <strong>{estimate.distanceKm.toFixed(2)} km</strong>
          </div>
          <div>
            <span>{wind ? 'Estimated total time' : 'Calm-air baseline'}</span>
            <strong>{minutesLabel(estimate.totalMinutes)}</strong>
          </div>
          <div>
            <span>Available after reserve</span>
            <strong>{minutesLabel(estimate.availableMinutes)}</strong>
          </div>
          <div>
            <span>
              {estimate.overBudget ? 'Over budget' : 'Time remaining'}
            </span>
            <strong>{minutesLabel(Math.abs(estimate.remainingMinutes))}</strong>
          </div>
        </div>
        {!wind && hasRoute && (
          <Notice>
            Wind is unverified. The displayed time assumes calm air.
          </Notice>
        )}
        {estimate.windExceeded && (
          <Notice tone="error">
            Wind or gusts meet or exceed the DJI FPV published wind resistance.
            Do not use this estimate as a fly recommendation.
          </Notice>
        )}
        {estimate.blocked && (
          <Notice tone="error">
            The assumed airspeed cannot maintain this route against the wind.
            One or more legs are not reachable in this model.
          </Notice>
        )}
        {estimate.overBudget && !estimate.blocked && (
          <Notice>
            Route exceeds your available time by{' '}
            {minutesLabel(-estimate.remainingMinutes)}. Shorten the route or
            review the budget and cruise assumptions.
          </Notice>
        )}
        {!!estimate.zoneNames.length && (
          <Notice tone="error">
            Route crosses verified airspace: {estimate.zoneNames.join(', ')}.
            Review the applicable restrictions.
          </Notice>
        )}
        {airspaceError && (
          <Notice tone="error">
            Airspace data could not load. Flight planning is blocked until it
            loads.
            <button className="button" onClick={() => void retryAirspace()}>
              Retry airspace data
            </button>
          </Notice>
        )}
        <div className="planner-preview">
          <div className="planner-actions">
            <button
              className="button"
              disabled={
                !hasRoute ||
                estimate.blocked ||
                estimate.airspaceBlocked ||
                !!plan.validationError
              }
              onClick={() => plan.setPlaying(!plan.playing)}
            >
              {plan.playing ? <Pause size={16} /> : <Play size={16} />}
              {plan.playing ? 'Pause preview' : 'Preview flight'}
            </button>
            <span>{Math.round(plan.progress * 100)}%</span>
          </div>
          <input
            type="range"
            aria-label="Flight preview progress"
            min="0"
            max="100"
            value={Math.round(plan.progress * 100)}
            disabled={
              !hasRoute ||
              estimate.blocked ||
              estimate.airspaceBlocked ||
              !!plan.validationError
            }
            onChange={(e) => plan.setProgress(Number(e.target.value) / 100)}
          />
          <small>
            Accelerated route simulation · not live drone tracking. Cyan: within
            time estimate. Amber: beyond budget. Red: wind issue or mapped
            airspace. Dashed: return leg.
          </small>
        </div>
        {!!plan.points.length && (
          <details className="planner-details">
            <summary>Waypoints ({plan.points.length})</summary>
            <ol className="planner-points">
              {plan.points.map((p, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      useExplorer
                        .getState()
                        .select(
                          p,
                          i ? `Waypoint ${i}` : 'Flight start',
                          true,
                          15,
                        );
                      plan.setExpanded(false);
                    }}
                  >
                    {i ? `Point ${i}` : 'Start'}{' '}
                    <small>
                      {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                    </small>
                  </button>
                  <button
                    aria-label={`Remove ${i ? 'waypoint ' + i : 'start point'}`}
                    onClick={() => plan.removePoint(i)}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ol>
          </details>
        )}
        <p className="planner-help">
          Airspace coverage is incomplete; an unmarked route is not flight
          clearance. Check official restrictions and conditions before flying.
        </p>
      </div>
    </aside>
  );
}
