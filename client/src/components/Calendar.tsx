import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { CalendarDay } from '../types';
import {
  calendarWeeks,
  dayPhase,
  formatDate,
  keyboardDate,
  localDateKey,
  phaseNames,
} from '../calendarView';
import styles from './Calendar.module.css';

export interface CalendarProps {
  days: CalendarDay[];
  viewDate: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  loading?: boolean;
}

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const legendPhases = ['period', 'fertile', 'ovulation'] as const;

function dateDescription(
  date: string,
  day: CalendarDay | undefined,
  today: string,
) {
  const parts = [
    formatDate(date, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  ];
  if (date === today) parts.push('Today');
  if (day?.cycleDay) parts.push(`Cycle day ${day.cycleDay}`);
  const phase = dayPhase(day);
  if (phase === 'period')
    parts.push(
      day?.isProjected
        ? 'Estimated period start'
        : day?.isPeriodStart
          ? 'Period start'
          : 'Period',
    );
  if (phase === 'fertile') parts.push('Estimated fertile window');
  if (phase === 'ovulation') parts.push('Estimated ovulation');
  return parts.join(', ');
}

export default function Calendar({
  days,
  viewDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  loading = false,
}: CalendarProps) {
  const headingId = useId();
  const monthId = useId();
  const grid = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const today = localDateKey();
  const month = viewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const weeks = calendarWeeks(viewDate);
  const monthKey = localDateKey(viewDate).slice(0, 7);
  const tabStop = selectedDate.startsWith(monthKey)
    ? selectedDate
    : today.startsWith(monthKey)
      ? today
      : `${monthKey}-01`;
  const dayByDate = new Map(days.map((day) => [day.date, day]));

  useEffect(() => {
    if (!pendingFocus.current) return;
    const button = grid.current?.querySelector<HTMLButtonElement>(
      `[data-date="${pendingFocus.current}"]`,
    );
    if (button) {
      button.focus();
      pendingFocus.current = null;
    }
  }, [selectedDate, monthKey]);

  function navigateDay(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const next = keyboardDate(date, event.key);
    if (!next) return;
    event.preventDefault();
    if (next === date) return;
    pendingFocus.current = next;
    onSelectDate(next);
  }

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 className={styles.title} id={headingId}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3.5" y="5" width="17" height="16" rx="3" />
            <path d="M7.5 3v4m9-4v4m-13 3.5h17" />
            <path d="M8.5 14.2h.1m3.4 0h.1m3.4 0h.1" strokeWidth="2" />
          </svg>
          Cycle calendar
        </h2>
        <button type="button" className={styles.todayButton} onClick={onToday}>
          Today
        </button>
      </header>
      <div className={styles.toolbar}>
        <h3 id={monthId} className={styles.month} aria-live="polite">
          {month}
        </h3>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Previous month"
            onClick={onPrevMonth}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
              <path d="m9.8 3.6-4.4 4.4 4.4 4.4" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Next month"
            onClick={onNextMonth}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
              <path d="M6.2 3.6 10.6 8l-4.4 4.4" />
            </svg>
          </button>
        </div>
      </div>
      <table
        className={styles.grid}
        ref={grid}
        aria-labelledby={monthId}
        aria-busy={loading}
      >
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th scope="col" key={day} aria-label={day}>
                {day.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].key}>
              {week.map(({ key, dayNumber, inMonth }) => {
                const day = dayByDate.get(key);
                const phase = inMonth ? dayPhase(day) : 'neutral';
                const description = dateDescription(key, day, today);
                return (
                  <td key={key}>
                    <button
                      type="button"
                      className={styles.day}
                      data-date={key}
                      data-phase={phase}
                      data-outside={!inMonth || undefined}
                      tabIndex={key === tabStop ? 0 : -1}
                      aria-label={description}
                      title={description}
                      aria-pressed={key === selectedDate}
                      aria-current={key === today ? 'date' : undefined}
                      onKeyDown={(event) => navigateDay(event, key)}
                      onClick={() => onSelectDate(key)}
                    >
                      <span className={styles.disc}>{dayNumber}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className={styles.legend} aria-label="Calendar legend">
        {legendPhases.map((phase) => (
          <li key={phase}>
            <i aria-hidden="true" data-phase={phase} />
            {phaseNames[phase]}
          </li>
        ))}
      </ul>
    </section>
  );
}
