import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { getProfiles } from './api';
import type { Profile } from './types';
import Dashboard from './pages/Dashboard';
import ProfileManagement from './pages/ProfileManagement';
import Icon from './components/Icon';
import Guide from './components/Guide';
import './styles/theme.css';
import styles from './App.module.css';

function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [revision, setRevision] = useState(0);
  const [guide, setGuide] = useState(false);
  const [guestStart, setGuestStart] = useState<string | undefined>();
  const profileId = new URLSearchParams(location.search).get('profile');
  const selected = profiles.find((p) => String(p.id) === profileId);
  const query = profileId ? `?profile=${profileId}` : '';
  const isCalendar = location.pathname === '/calendar';
  const isProfiles = location.pathname === '/profiles';

  useEffect(() => {
    const controller = new AbortController();
    getProfiles(controller.signal)
      .then(setProfiles)
      .catch(() => {});
    return () => controller.abort();
  }, [revision, location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navigation = (
    <>
      <NavLink
        to={`/${query}`}
        end
        className={() => (!isCalendar && !isProfiles ? styles.active : '')}
      >
        <Icon name="grid" />
        <span>Overview</span>
      </NavLink>
      <NavLink
        to={`/calendar${query}`}
        className={isCalendar ? styles.active : ''}
      >
        <Icon name="calendar" />
        <span>Calendar</span>
      </NavLink>
      <NavLink to="/profiles" className={isProfiles ? styles.active : ''}>
        <Icon name="users" />
        <span>Profiles</span>
      </NavLink>
    </>
  );

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <NavLink to="/" className={styles.brand} aria-label="Cyclelator home">
          <span className={styles.brandMark}>
            <Icon name="flower" size={30} />
          </span>
          Cyclelator<span className={styles.brandDot}>.</span>
        </NavLink>
        <div className={styles.navLabel}>YOUR WORKSPACE</div>
        <nav className={styles.navigation} aria-label="Main navigation">
          {navigation}
        </nav>
        <div className={styles.sideGuide}>
          <span className={styles.navLabel}>EXPLORE</span>
          <button onClick={() => setGuide(true)}>
            <Icon name="book" />
            Cycle guide
            <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className={styles.sideBottom}>
          <label className={styles.switcher}>
            <span
              className={styles.avatar}
              style={
                selected ? { background: selected.avatar_color } : undefined
              }
            >
              {selected?.nickname.slice(0, 1).toUpperCase() || 'G'}
            </span>
            <span className={styles.switcherText}>
              <strong>{selected?.nickname || 'Guest workspace'}</strong>
              <small>
                {selected ? 'Saved profile' : 'Dates kept for this visit'}
              </small>
            </span>
            <Icon name="chevron" size={16} />
            <select
              aria-label="Switch workspace"
              value={profileId || ''}
              onChange={(e) =>
                navigate(
                  e.target.value ? `/dashboard?profile=${e.target.value}` : '/',
                )
              }
            >
              <option value="">Guest workspace</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.breadcrumb}>
            Your workspace <span>/</span>{' '}
            <strong>
              {isProfiles ? 'Profiles' : isCalendar ? 'Calendar' : 'Overview'}
            </strong>
          </span>
          <span className={styles.topDate}>
            <Icon name="calendar" size={15} />
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <NavLink to="/" className={styles.mobileBrand}>
            <Icon name="flower" size={25} />
            Cyclelator<span>.</span>
          </NavLink>
          <button
            className={styles.mobileGuide}
            aria-label="Open cycle guide"
            onClick={() => setGuide(true)}
          >
            <Icon name="book" />
          </button>
        </header>
        <main className={styles.content} id="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  guestStart={guestStart}
                  onGuestStart={setGuestStart}
                  onGuide={() => setGuide(true)}
                  profiles={profiles}
                  revision={revision}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  guestStart={guestStart}
                  onGuestStart={setGuestStart}
                  onGuide={() => setGuide(true)}
                  profiles={profiles}
                  revision={revision}
                />
              }
            />
            <Route
              path="/calendar"
              element={
                <Dashboard
                  guestStart={guestStart}
                  onGuestStart={setGuestStart}
                  calendarOnly
                  onGuide={() => setGuide(true)}
                  profiles={profiles}
                  revision={revision}
                />
              }
            />
            <Route
              path="/profiles"
              element={
                <ProfileManagement
                  onProfilesChange={() => setRevision((n) => n + 1)}
                />
              }
            />
            <Route
              path="*"
              element={
                <div className="page-header">
                  <div>
                    <h1>Let’s find your way.</h1>
                    <p>
                      <NavLink to="/">Return to your cycle overview →</NavLink>
                    </p>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className={styles.footer}>
          <span>
            {selected
              ? 'Saved profile'
              : 'Guest dates are kept for this visit.'}
          </span>
          <button onClick={() => setGuide(true)}>
            How estimates work <Icon name="arrow" size={13} />
          </button>
        </footer>
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {navigation}
      </nav>
      {guide && <Guide onClose={() => setGuide(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Workspace />
    </BrowserRouter>
  );
}
