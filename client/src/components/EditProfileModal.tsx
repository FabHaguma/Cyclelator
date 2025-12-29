import React, { useState, useEffect } from 'react';
import { getCycles, updateProfile, addCycle, updateCycle, deleteCycle } from '../api';
import type { Profile, Cycle } from '../types';
import styles from './EditProfileModal.module.css';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onSave: () => void;
}

interface EditableCycle extends Cycle {
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profile, onSave }) => {
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarColor, setAvatarColor] = useState(profile.avatar_color);
  const [manualLength, setManualLength] = useState<string>(profile.manual_cycle_length?.toString() || '');
  const [cycles, setCycles] = useState<EditableCycle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname(profile.nickname);
      setAvatarColor(profile.avatar_color);
      setManualLength(profile.manual_cycle_length?.toString() || '');
      loadCycles();
    }
  }, [isOpen, profile]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const data = await getCycles(profile.id);
      setCycles(data);
    } catch (err) {
      console.error('Failed to load cycles', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCycleChange = (index: number, date: string) => {
    const newCycles = [...cycles];
    newCycles[index] = { ...newCycles[index], start_date: date, isModified: true };
    setCycles(newCycles);
  };

  const handleDeleteCycle = (index: number) => {
    const newCycles = [...cycles];
    if (newCycles[index].isNew) {
      newCycles.splice(index, 1);
    } else {
      newCycles[index].isDeleted = true;
    }
    setCycles(newCycles);
  };

  const handleAddCycle = () => {
    setCycles([
      {
        id: -Date.now(), // Temporary ID
        profile_id: profile.id,
        start_date: new Date().toISOString().split('T')[0],
        computed_length: null,
        isNew: true
      },
      ...cycles
    ]);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Update profile
      await updateProfile(profile.id, {
        nickname,
        avatar_color: avatarColor,
        manual_cycle_length: manualLength ? parseInt(manualLength) : null
      });

      // Process cycles
      const promises = cycles.map(async (cycle) => {
        if (cycle.isDeleted) {
          if (!cycle.isNew) {
            await deleteCycle(cycle.id);
          }
        } else if (cycle.isNew) {
          await addCycle(profile.id, cycle.start_date);
        } else if (cycle.isModified) {
          await updateCycle(cycle.id, cycle.start_date);
        }
      });

      await Promise.all(promises);
      
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save changes', err);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Profile: {profile.nickname}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Nickname</label>
          <input
            className={styles.input}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Color</label>
          <input
            type="color"
            className={styles.input}
            value={avatarColor}
            onChange={e => setAvatarColor(e.target.value)}
            style={{ height: '40px' }}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Manual Cycle Length (days)</label>
          <input
            type="number"
            className={styles.input}
            value={manualLength}
            onChange={e => setManualLength(e.target.value)}
            placeholder="Auto-calculated if empty"
          />
        </div>

        <div className={styles.cyclesSection}>
          <h3>Cycles History</h3>
          <button className={styles.addButton} onClick={handleAddCycle}>
            + Add Past Cycle Date
          </button>
          
          <ul className={styles.cyclesList}>
            {cycles.filter(c => !c.isDeleted).map((cycle, index) => (
              <li key={cycle.id} className={styles.cycleItem}>
                <input
                  type="date"
                  className={styles.input}
                  value={cycle.start_date}
                  onChange={e => handleCycleChange(index, e.target.value)}
                />
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDeleteCycle(index)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button className={styles.saveButton} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
