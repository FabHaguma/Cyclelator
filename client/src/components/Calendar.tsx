import React from 'react';
import type { CalendarDay } from '../types';
import styles from './Calendar.module.css';

interface CalendarProps {
  days: CalendarDay[];
  viewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ days, viewDate, onPrevMonth, onNextMonth }) => {
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  console.log('Calendar rendering with', days.length, 'days');

  // Calculate padding days for the start of the month
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.header}>
        <button onClick={onPrevMonth} className={styles.navButton}>&lt;</button>
        <h3 className={styles.monthTitle}>{monthName} {year}</h3>
        <button onClick={onNextMonth} className={styles.navButton}>&gt;</button>
      </div>
      <div className={styles.grid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className={styles.weekdayHeader}>{day}</div>
        ))}
        {paddingDays.map(i => (
          <div key={`pad-${i}`} className={styles.dayPadding}></div>
        ))}
        {days.map((day) => {
          let className = styles.day;
          if (day.isOvulation) className += ` ${styles.ovulation}`;
          else if (day.isDangerous) className += ` ${styles.dangerous}`;
          else if (day.isPeriodStart || day.isPeriodDay) className += ` ${styles.period}`;
          else className += ` ${styles.neutral}`;

          if (day.isProjected) className += ` ${styles.projected}`;

          return (
            <div key={day.date} className={className} title={day.date + (day.isProjected ? ' (Projected)' : '')}>
              <div className={styles.dayNumber}>{new Date(day.date).getUTCDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
