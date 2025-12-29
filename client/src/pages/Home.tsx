import React, { useEffect, useState } from 'react';
import { getGuestCalendar } from '../api';
import type { CalendarDay } from '../types';
import Calendar from '../components/Calendar';
import styles from './Home.module.css';

const Home: React.FC = () => {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [viewDate, setViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    loadCalendar(viewDate, periodStartDate);
  }, [viewDate, periodStartDate]);

  const loadCalendar = async (date: Date, cycleStart?: string) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const startStr = `${year}-${month}-01`;
      
      const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
      const endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const data = await getGuestCalendar(startStr, endStr, cycleStart || undefined);
      console.log('Calendar data received:', data.length, 'days');
      setCalendarDays(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <section className={styles.calendarSection}>
          {loading ? (
            <div className={styles.loading}>Loading calendar...</div>
          ) : (
            <Calendar 
              days={calendarDays} 
              viewDate={viewDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          )}
        </section>

        <section className={styles.sideSection}>
          <header className={styles.header}>
            <h2 className={styles.title}>Welcome to Cyclelator</h2>
            <p className={styles.subtitle}>Input the start date of a period to begin tracking.</p>
          </header>

          <div className={styles.addCycleSection}>
            <h3 className={styles.addCycleTitle}>Add Period Start</h3>
            <div className={styles.inputGroup}>
              <input 
                type="date" 
                value={periodStartDate} 
                onChange={(e) => setPeriodStartDate(e.target.value)}
                className={styles.dateInput}
              />
              <button 
                onClick={() => setPeriodStartDate('')} 
                className="btn-secondary"
                disabled={!periodStartDate}
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
