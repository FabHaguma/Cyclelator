import React, { useEffect, useState, useCallback } from 'react';
import { getProfiles, getCalendar, addCycle } from '../api';
import type { Profile, CalendarDay } from '../types';
import Calendar from '../components/Calendar';
import ProfileManagement from './ProfileManagement';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCycleDate, setNewCycleDate] = useState('');
  const [viewDate, setViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isProfileManagementExpanded, setIsProfileManagementExpanded] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
      if (data.length > 0 && !selectedProfileId) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (selectedProfileId) {
      loadCalendar(selectedProfileId, viewDate);
    } else {
      setCalendarDays([]);
    }
  }, [selectedProfileId, viewDate]);

  const loadCalendar = async (profileId: number, date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const startStr = `${year}-${month}-01`;
      
      const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
      const endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const data = await getCalendar(profileId, startStr, endStr);
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

  const handleAddCycle = async () => {
    if (!selectedProfileId || !newCycleDate) return;
    try {
      await addCycle(selectedProfileId, newCycleDate);
      setNewCycleDate('');
      loadCalendar(selectedProfileId, viewDate); // Reload calendar to reflect changes
    } catch (err) {
      console.error(err);
      alert('Failed to add cycle');
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <section className={styles.calendarSection}>
          {loading ? (
            <p className={styles.loading}>Loading calendar...</p>
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
            <h2 className={styles.title}>Tracking: {selectedProfile?.nickname || 'Select Profile'}</h2>
            <select 
              value={selectedProfileId || ''} 
              onChange={(e) => setSelectedProfileId(Number(e.target.value))}
              className={styles.select}
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.nickname}</option>
              ))}
            </select>
          </header>

          {selectedProfile && (
            <div className={styles.addCycleSection}>
              <h3 className={styles.addCycleTitle}>Add Period Start</h3>
              <input 
                type="date" 
                value={newCycleDate} 
                onChange={(e) => setNewCycleDate(e.target.value)}
                className={styles.dateInput}
              />
              <button onClick={handleAddCycle} className="btn-primary">Add</button>
            </div>
          )}

          <div className={styles.profileManagementSection}>
            <button 
              className={styles.toggleButton}
              onClick={() => setIsProfileManagementExpanded(!isProfileManagementExpanded)}
            >
              <span className={styles.toggleButtonText}>Profile Management</span>
              <span className={`${styles.toggleIcon} ${isProfileManagementExpanded ? styles.toggleIconExpanded : ''}`}>▼</span>
            </button>
            {isProfileManagementExpanded && <ProfileManagement onProfilesChange={loadProfiles} />}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
