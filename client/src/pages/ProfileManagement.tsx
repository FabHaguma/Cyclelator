import React, { useEffect, useState, useCallback } from 'react';
import { getProfiles, createProfile, deleteProfile } from '../api';
import type { Profile } from '../types';
import styles from './ProfileManagement.module.css';
import EditProfileModal from '../components/EditProfileModal';

interface ProfileManagementProps {
  onProfilesChange?: () => void;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ onProfilesChange }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newNickname, setNewNickname] = useState('');
  const [newColor, setNewColor] = useState('#4a90e2');
  
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadProfiles();
    };
    init();
  }, [loadProfiles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname) return;
    try {
      await createProfile({ nickname: newNickname, avatar_color: newColor });
      setNewNickname('');
      setNewColor('#4a90e2');
      loadProfiles();
      onProfilesChange?.();
    } catch (err) {
      console.error(err);
      alert('Failed to create profile');
    }
  };

  const handleEditClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const handleModalSave = () => {
    loadProfiles();
    onProfilesChange?.();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await deleteProfile(id);
      loadProfiles();
      onProfilesChange?.();
    } catch (err) {
      console.error(err);
      alert('Failed to delete profile');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Profile Management</h2>
      
      <form onSubmit={handleCreate} className={styles.form}>
        <h3 className={styles.formTitle}>Create New Profile</h3>
        <div className={styles.formGroup}>
          <label>Nickname: </label>
          <input 
            value={newNickname} 
            onChange={(e) => setNewNickname(e.target.value)} 
            required 
            className={styles.input}
          />
          <label>Color: </label>
          <input 
            type="color" 
            value={newColor} 
            onChange={(e) => setNewColor(e.target.value)} 
            className={styles.colorInput}
          />
        </div>
        <button type="submit" className="btn-primary">Create Profile</button>
      </form>

      <ul className={styles.profileList}>
        {profiles.map(profile => (
          <li key={profile.id} className={styles.profileItem}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar} style={{ backgroundColor: profile.avatar_color }}></div>
              <span className={styles.nickname}>{profile.nickname}</span>
              {profile.manual_cycle_length && <span className={styles.manualLengthLabel}>(Fixed: {profile.manual_cycle_length} days)</span>}
            </div>
            <div className={styles.actions}>
              <button onClick={() => handleEditClick(profile)} className="btn-secondary">Edit</button>
              <button onClick={() => handleDelete(profile.id)} className="btn-danger">Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {selectedProfile && (
        <EditProfileModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          profile={selectedProfile}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default ProfileManagement;
