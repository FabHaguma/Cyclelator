import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { addCycle, getCalendar, getGuestCalendar } from '../api';
import type { CalendarDay, Profile } from '../types';
import Calendar from '../components/Calendar';
import Icon from '../components/Icon';
import {
  dayPhase,
  formatDate,
  localDateKey,
  monthRange,
  parseDateKey,
  shiftMonth,
  offsetDate,
  dayDifference,
} from '../calendarView';
import styles from './Dashboard.module.css';

interface Props {
  profiles: Profile[];
  revision: number;
  onGuide: () => void;
  calendarOnly?: boolean;
  guestStart?: string;
  onGuestStart: (date: string) => void;
}

export default function Dashboard({
  profiles,
  revision,
  onGuide,
  calendarOnly = false,
  guestStart,
  onGuestStart,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedId = new URLSearchParams(location.search).get('profile');
  const profileId = requestedId
    ? Number(requestedId) || -1
    : location.pathname === '/dashboard'
      ? profiles[0]?.id
      : undefined;
  const profile = profiles.find((p) => p.id === profileId);
  const today = localDateKey();
  const example = !profileId && guestStart === undefined;
  const anchor = example ? offsetDate(today, -11) : guestStart;
  const [viewDate, setViewDate] = useState(() => parseDateKey(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [logging, setLogging] = useState(false);
  const [entryDate, setEntryDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const current = days.find((day) => day.date === selectedDate);
  const phase = dayPhase(current);
  const range = monthRange(viewDate);
  const model =
    current?.model === 'manual'
      ? 'Fixed cycle'
      : current?.model === 'adaptive'
        ? 'Adaptive model'
        : 'Standard model';

  useEffect(() => {
    if (location.pathname === '/dashboard' && !requestedId && profiles.length) {
      navigate(`/dashboard?profile=${profiles[0].id}`, { replace: true });
    }
  }, [location.pathname, requestedId, profiles, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDays([]);
    const request = profileId
      ? getCalendar(profileId, range.start, range.end, controller.signal)
      : getGuestCalendar(
          range.start,
          range.end,
          anchor || undefined,
          controller.signal,
        );
    request
      .then((data) => {
        if (!controller.signal.aborted) setDays(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : 'Unable to load the calendar.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [profileId, range.start, range.end, anchor, revision, refresh]);

  useEffect(() => {
    if (!logging) return;
    const element = dialog.current!;
    element.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = old;
    };
  }, [logging]);

  function selectDate(date: string) {
    setSelectedDate(date);
    if (date.slice(0, 7) !== range.start.slice(0, 7))
      setViewDate(parseDateKey(date));
  }

  function changeMonth(amount: number) {
    const next = shiftMonth(viewDate, amount);
    setViewDate(next);
    setSelectedDate(localDateKey(next));
  }

  function openLog() {
    setEntryDate(selectedDate > today ? today : selectedDate);
    setSaveError('');
    setLogging(true);
  }

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedDate = String(
      new FormData(event.currentTarget).get('start_date') || '',
    );
    if (!submittedDate || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      if (profileId) {
        await addCycle(profileId, submittedDate);
        setRefresh((n) => n + 1);
        setMessage('Period start saved. Your estimates are updated.');
      } else {
        onGuestStart(submittedDate);
        setMessage('Guest calendar updated for this visit.');
      }
      setSelectedDate(submittedDate);
      setViewDate(parseDateKey(submittedDate));
      setLogging(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Unable to save. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  const phaseLabel =
    phase === 'period'
      ? current?.isProjected
        ? 'Estimated period start'
        : 'Period start'
      : phase === 'ovulation'
        ? 'Estimated ovulation'
        : phase === 'fertile'
          ? 'Fertile window'
          : 'Cycle in progress';
  const forecast = [
    {
      icon: 'flower' as const,
      label: 'Fertile window',
      value:
        current?.fertileStart && current.ovulationDate
          ? `${formatDate(current.fertileStart)} – ${formatDate(current.ovulationDate)}`
          : 'Awaiting a start date',
      tone: 'fertile',
      note: 'Estimated six-day window',
    },
    {
      icon: 'orbit' as const,
      label: 'Ovulation',
      value: current?.ovulationDate
        ? formatDate(current.ovulationDate, { month: 'long', day: 'numeric' })
        : 'Awaiting a start date',
      tone: 'ovulation',
      note: 'Estimated ovulation day',
    },
    {
      icon: 'drop' as const,
      label: 'Next period',
      value: current?.nextPeriod
        ? formatDate(current.nextPeriod, { month: 'long', day: 'numeric' })
        : 'Awaiting a start date',
      tone: 'period',
      note: current?.nextPeriod
        ? `${dayDifference(selectedDate, current.nextPeriod)} days after selected date`
        : 'Log a start to see estimates',
    },
  ];

  return (
    <div className={styles.dashboard}>
      <header className="page-header">
        <div>
          {profile && (
            <div className={styles.eyebrow}>Tracking · {profile.nickname}</div>
          )}
          <h1>{calendarOnly ? 'Your cycle calendar' : 'Cycle overview'}</h1>
          <p>
            {calendarOnly
              ? 'Explore the dates. See the pattern.'
              : 'A clearer view of your cycle, one day at a time.'}
          </p>
        </div>
        <button className="btn-primary" onClick={openLog}>
          <Icon name="plus" size={17} />
          Log period
        </button>
      </header>
      {error && (
        <div className="notice" role="alert">
          {error}
          <button onClick={() => setRefresh((n) => n + 1)}>Try again</button>
          <Link to="/profiles">View profiles</Link>
        </div>
      )}
      {message && (
        <div className={styles.success} role="status">
          <Icon name="check" size={15} />
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage('')}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <div className={styles.context}>
        <span className={styles.mode}>
          <i />
          {profileId ? profile?.nickname || 'Saved profile' : 'Guest mode'}
          {example && (
            <span className={styles.exampleBadge}>Example cycle</span>
          )}
        </span>
        {profileId ? (
          <Link to="/profiles">
            Manage profiles <Icon name="arrow" size={13} />
          </Link>
        ) : (
          <Link to="/profiles?new=1">
            Create a profile <Icon name="arrow" size={13} />
          </Link>
        )}
      </div>
      {!calendarOnly && (
        <section className={styles.hero} aria-label="Selected cycle snapshot">
          <div className={styles.heroArt} aria-hidden="true" />
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              <Icon name="orbit" size={16} />
              {selectedDate === today
                ? 'TODAY’S SNAPSHOT'
                : formatDate(selectedDate, {
                    month: 'long',
                    day: 'numeric',
                  }).toUpperCase()}
            </div>
            <h2>
              {loading ? (
                'Finding your rhythm…'
              ) : current?.cycleDay ? (
                <>
                  Day {current.cycleDay} <em>of {current.cycleLength}</em>
                </>
              ) : (
                <>
                  Your cycle.
                  <br />
                  <em>A little clearer.</em>
                </>
              )}
            </h2>
            <span className={styles.phasePill} data-phase={phase}>
              <i />
              {loading
                ? 'Loading calendar'
                : current?.cycleDay
                  ? phaseLabel
                  : 'Begin with a period start'}
            </span>
            <p>
              {example
                ? 'An example of what your cycle could look like.'
                : current?.cycleDay
                  ? 'Estimates may shift as you record new cycle starts.'
                  : 'Log a start date to see your cycle take shape.'}
            </p>
            {current?.cycleDay ? (
              <div className={styles.progressWrap}>
                <div
                  className={styles.progress}
                  aria-label={`Cycle day ${current.cycleDay} of ${current.cycleLength}`}
                >
                  {Array.from({ length: 28 }, (_, i) => (
                    <i
                      key={i}
                      data-filled={
                        i / 28 < current.cycleDay! / current.cycleLength ||
                        undefined
                      }
                    />
                  ))}
                </div>
                <div className={styles.progressLabels}>
                  <span>Day 1</span>
                  <span>Day {current.cycleLength}</span>
                </div>
              </div>
            ) : (
              <button className={styles.heroLink} onClick={openLog}>
                Add your start date <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        </section>
      )}
      <div className={styles.bodyGrid}>
        <div className={styles.calendarColumn}>
          <Calendar
            days={days}
            viewDate={viewDate}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            onPrevMonth={() => changeMonth(-1)}
            onNextMonth={() => changeMonth(1)}
            onToday={() => {
              setViewDate(parseDateKey(today));
              setSelectedDate(today);
            }}
            loading={loading}
          />
          <div className={styles.dayDetail} aria-live="polite">
            <span className={styles.detailDate}>
              <strong>{formatDate(selectedDate, { day: 'numeric' })}</strong>
              <span>{formatDate(selectedDate, { month: 'short' })}</span>
            </span>
            <div>
              <h3>
                {formatDate(selectedDate, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <p>
                {loading
                  ? 'Loading cycle details…'
                  : current?.cycleDay
                    ? `Cycle day ${current.cycleDay} · ${phaseLabel}${example ? ' · Example' : ''}`
                    : 'No recorded cycle for this date'}
              </p>
            </div>
            <button aria-label="Log period on selected date" onClick={openLog}>
              <Icon name="plus" size={18} />
            </button>
          </div>
        </div>
        <aside className={styles.rightColumn}>
          <section className={styles.forecast}>
            <h2>
              Cycle forecast <Icon name="orbit" size={19} />
            </h2>
            <p className={styles.forecastCaption}>
              {example
                ? 'Estimates for the example cycle'
                : 'Estimates for the selected cycle'}
            </p>
            <div className={styles.forecastRows}>
              {forecast.map((item) => (
                <div key={item.label} className={styles.forecastRow}>
                  <span className={styles.forecastIcon} data-tone={item.tone}>
                    <Icon name={item.icon} size={20} />
                  </span>
                  <div>
                    <span>{item.label}</span>
                    <strong>{loading ? 'Loading…' : item.value}</strong>
                    <small>{item.note}</small>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.textLink} onClick={onGuide}>
              How are these calculated? <Icon name="arrow" size={14} />
            </button>
          </section>
          <section className={styles.model}>
            <span className={styles.modelIcon}>
              <Icon name="orbit" size={25} />
            </span>
            <div>
              <h3>{model}</h3>
              <p>
                {current?.cycleLength || 28}-day cycle ·{' '}
                {profileId ? 'Saved profile' : 'Guest calendar'}
              </p>
            </div>
            <button aria-label="Learn about cycle models" onClick={onGuide}>
              <Icon name="arrow" size={16} />
            </button>
          </section>
        </aside>
      </div>
      {!profileId && (
        <div className={styles.guestNote}>
          <Icon name="flower" size={20} />
          <p>
            {example
              ? 'Make it yours. Log your period to replace this example with your own dates.'
              : 'Your guest dates stay for this visit. Create a profile to keep your history.'}
          </p>
          {example ? (
            <button onClick={openLog}>
              Use my dates <Icon name="arrow" size={14} />
            </button>
          ) : (
            <button
              onClick={() => {
                onGuestStart('');
                setMessage('Guest date cleared.');
              }}
            >
              Clear date
            </button>
          )}
        </div>
      )}
      {logging && (
        <dialog
          ref={dialog}
          className={styles.logDialog}
          onCancel={(e) => {
            e.preventDefault();
            if (!saving) setLogging(false);
          }}
          aria-labelledby="log-title"
        >
          <div className={styles.logHeading}>
            <span className={styles.logIcon}>
              <Icon name="drop" size={24} />
            </span>
            <button
              aria-label="Close period dialog"
              disabled={saving}
              onClick={() => setLogging(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="log-title">A new beginning.</h2>
          <p>
            {profileId
              ? `Log a period start for ${profile?.nickname || 'this profile'}.`
              : 'Choose the first day of your most recent period.'}
          </p>
          <form onSubmit={savePeriod}>
            <label htmlFor="period-date">Period start date</label>
            <input
              autoFocus
              id="period-date"
              name="start_date"
              type="date"
              required
              value={entryDate}
              max={today}
              onChange={(e) => setEntryDate(e.target.value)}
              disabled={saving}
            />
            <small>
              {profileId
                ? 'Your forecast updates as soon as you save.'
                : 'Guest dates are kept for this visit.'}
            </small>
            {saveError && (
              <p role="alert" className={styles.saveError}>
                {saveError}
              </p>
            )}
            <div className={styles.logActions}>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setLogging(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : profileId
                    ? 'Save period start'
                    : 'Update calendar'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
