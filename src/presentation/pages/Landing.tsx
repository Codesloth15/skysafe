import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Compass,
  MapPin,
  Radar,
  Search,
  ShieldQuestion,
} from 'lucide-react';
import '../../styles/landing.css';

function Drone({
  size = 24,
  strokeWidth = 2,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth * 3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M65 65 42 42M95 65l23-23M65 95l-23 23M95 95l23 23"
        strokeWidth="10"
      />
      <circle cx="35" cy="35" r="26" />
      <circle cx="125" cy="35" r="26" />
      <circle cx="35" cy="125" r="26" />
      <circle cx="125" cy="125" r="26" />
      <path
        d="M18 35h34M35 18v34M108 35h34M125 18v34M18 125h34M35 108v34M108 125h34M125 108v34"
        opacity=".55"
      />
      <rect x="57" y="52" width="46" height="58" rx="17" />
      <path d="M72 67h16M73 97h14" />
      <circle cx="80" cy="82" r="5" />
    </svg>
  );
}
const features = [
  {
    icon: Search,
    title: 'Find your next perspective.',
    text: 'Search a place, enter coordinates, or pick a point on the map. Start with the location you have in mind.',
  },
  {
    icon: Radar,
    title: 'See what’s around you.',
    text: 'Explore nearby airports and heliports, adjust proximity rings, and review the available location information.',
  },
  {
    icon: Bookmark,
    title: 'Keep the good spots.',
    text: 'Save locations on this device, so your next planning session starts where you left off.',
  },
];

export default function Landing() {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-main">
        Skip to main content
      </a>
      <header className="landing-nav landing-container">
        <Link className="landing-brand" to="/" aria-label="SkySafe home">
          <Compass size={30} />
          <span>
            SkySafe<span className="landing-brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link className="landing-nav-cta" to="/explore">
            Open app <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="landing-main">
        <section className="landing-hero landing-container">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <span /> MADE FOR DRONE EXPLORERS
            </span>
            <h1>
              A better flight
              <br />
              starts with
              <br />
              <em>a clearer view.</em>
            </h1>
            <p>
              Your next shot starts on the ground. Explore Philippine airspace,
              understand nearby aviation facilities, and plan your drone locations
              with more awareness.
            </p>
            <div className="landing-actions">
              <Link className="landing-primary" to="/explore">
                Open Airspace Map <ArrowRight size={19} />
              </Link>
              <a className="landing-secondary" href="#how-it-works">
                See how it works <span>↗</span>
              </a>
            </div>
            <div className="landing-hero-note">
              <Compass size={16} /> Philippines coverage <span>•</span> No
              account needed
            </div>
          </div>
          <div
            className="landing-visual"
            role="img"
            aria-label="Illustration of a drone above a flight planning grid"
          >
            <div className="landing-visual-top">
              <span>
                <span className="landing-live-dot" /> YOUR NEXT PERSPECTIVE
              </span>
              <span>PH / 01</span>
            </div>
            <div className="landing-orbit orbit-one" />
            <div className="landing-orbit orbit-two" />
            <div className="landing-orbit orbit-three" />
            <svg
              className="landing-flight-path"
              viewBox="0 0 500 550"
              aria-hidden="true"
            >
              <path
                d="M-20 430 C170 460 80 300 260 280 S430 120 540 190"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="7 9"
              />
            </svg>
            <div className="landing-drone">
              <Drone strokeWidth={1.05} />
            </div>
            <div className="landing-point">
              <MapPin size={19} />
              <span>A new point of view</span>
            </div>
            <div className="landing-visual-card">
              <span className="landing-card-icon">
                <Radar size={23} />
              </span>
              <div>
                <strong>Make awareness part of the plan.</strong>
                <span>Explore. Review. Verify.</span>
              </div>
              <ArrowUpRight size={19} />
            </div>
            <span className="landing-visual-caption">
              FLIGHT PLANNING, WITH PERSPECTIVE.
            </span>
          </div>
        </section>
        <div className="landing-strip">
          <div className="landing-container">
            <span>
              <MapPin size={18} /> Location exploration
            </span>
            <span>
              <Radar size={18} /> Airport proximity
            </span>
            <span>
              <Bookmark size={18} /> Saved places
            </span>
            <span>
              <Drone size={18} /> Built for drone planning
            </span>
          </div>
        </div>
        <section id="features" className="landing-section landing-container">
          <div className="landing-section-heading">
            <div>
              <span className="landing-eyebrow">
                LESS GUESSWORK. MORE CONTEXT.
              </span>
              <h2>
                Get to know the place
                <br />
                before you take off.
              </h2>
            </div>
            <p>
              A focused workspace for the questions that come before a flight.
            </p>
          </div>
          <div className="landing-features">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <div className="landing-feature-top">
                  <Icon size={25} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="landing-how landing-container">
          <div>
            <span className="landing-eyebrow">FROM IDEA TO INFORMED PLAN</span>
            <h2>
              One spot.
              <br />
              Three simple steps.
            </h2>
            <Link className="landing-secondary" to="/checker">
              Check a location <ArrowRight size={18} />
            </Link>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Choose your location</h3>
                <p>
                  Search a destination or drop a point on the interactive map.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Review the surroundings</h3>
                <p>
                  Look at nearby aviation facilities, proximity advisories, and
                  data coverage.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Verify before you fly</h3>
                <p>
                  Confirm current restrictions and requirements with official
                  aviation sources.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="landing-trust landing-container">
          <ShieldQuestion size={29} />
          <div>
            <h3>A clear map is not clearance to fly.</h3>
            <p>
              SkySafe is a planning aid. Official airspace coverage is
              incomplete, and airport proximity alone cannot establish flight
              permission.
            </p>
          </div>
          <Link to="/about">
            Understand the data <ArrowUpRight size={17} />
          </Link>
        </section>
        <section className="landing-final landing-container">
          <span className="landing-eyebrow">KNOW BEFORE YOU FLY</span>
          <h2>Where will your next flight take you?</h2>
          <Link className="landing-primary" to="/explore">
            Explore the map <ArrowRight size={19} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <Link className="landing-brand" to="/">
          <Compass size={23} />
          <span>SkySafe.</span>
        </Link>
        <p>A little awareness. A better flight.</p>
        <Link to="/about">
          About & data sources <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
