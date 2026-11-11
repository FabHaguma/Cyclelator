import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProfiles, reorderProfiles } from '../api';
import type { Profile } from '../types';
import EditProfileModal from '../components/EditProfileModal';
import Icon from '../components/Icon';
import styles from './ProfileManagement.module.css';

export default function ProfileManagement({
  onProfilesChange,
}: {
  onProfilesChange?: () => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Profile | null | undefined>();
  const [dragging, setDragging] = useState<number | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfiles(await getProfiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(null);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  async function move(id: number, position: number) {
    if (ordering) return;
    const oldPosition = profiles.findIndex((p) => p.id === id);
    if (oldPosition < 0 || oldPosition === position) return;
    const previous = profiles;
    const ordered = [...profiles];
    const [profile] = ordered.splice(oldPosition, 1);
    ordered.splice(position, 0, profile);
    setProfiles(ordered);
    setOrdering(true);
    setError('');
    try {
      await reorderProfiles(ordered.map((p) => p.id));
      setMessage('Profile order saved.');
      onProfilesChange?.();
    } catch (err) {
      setProfiles(previous);
      setError(
        err instanceof Error ? err.message : 'Could not save the order.',
      );
    } finally {
      setOrdering(false);
      setDragging(null);
    }
  }

  function saved(text: string) {
    setEditing(undefined);
    setMessage(text);
    void load();
    onProfilesChange?.();
  }

  return (
    <div className={styles.page}>
      <header className="page-header">
        <div>
          <h1>Profiles</h1>
          <p>A calendar and a little clarity for each person you track.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(null)}>
          <Icon name="plus" size={17} />
          New profile
        </button>
      </header>
      {error && (
        <div className="notice" role="alert">
          {error}
          <button onClick={load}>Try again</button>
        </div>
      )}
      {message && (
        <div className={styles.success} role="status">
          <Icon name="check" size={16} />
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <section className={styles.panel} aria-labelledby="profiles-title">
        <div className={styles.panelHeader}>
          <h2 id="profiles-title">
            Your profiles <span>{profiles.length}</span>
          </h2>
          <p>Reorder with the handles or arrow buttons.</p>
        </div>
        {loading ? (
          <div className={styles.loading} role="status">
            Loading your profiles…
          </div>
        ) : profiles.length ? (
          <ul
            className={styles.list}
            aria-label="Saved profiles"
            aria-busy={ordering}
          >
            {profiles.map((profile, index) => (
              <li
                key={profile.id}
                className={styles.row}
                data-dragging={dragging === profile.id || undefined}
                onDragOver={(event) => {
                  if (dragging !== null) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging !== null) void move(dragging, index);
                }}
              >
                <span
                  className={styles.dragHandle}
                  draggable={!ordering}
                  onDragStart={(event) => {
                    setDragging(profile.id);
                    event.dataTransfer.setData(
                      'text/plain',
                      String(profile.id),
                    );
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDragging(null)}
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  ⠿
                </span>
                <Link
                  className={styles.identity}
                  to={`/dashboard?profile=${profile.id}`}
                >
                  <span
                    className={styles.avatar}
                    style={{ background: profile.avatar_color }}
                  >
                    {profile.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.profileText}>
                    <strong>{profile.nickname}</strong>
                    <small>
                      {profile.manual_cycle_length
                        ? `Fixed ${profile.manual_cycle_length}-day cycle`
                        : 'Automatic cycle estimates'}
                    </small>
                  </span>
                </Link>
                <div className={styles.actions}>
                  <div className={styles.reorder}>
                    <button
                      disabled={index === 0 || ordering}
                      aria-label={`Move ${profile.nickname} up`}
                      onClick={() => move(profile.id, index - 1)}
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === profiles.length - 1 || ordering}
                      aria-label={`Move ${profile.nickname} down`}
                      onClick={() => move(profile.id, index + 1)}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    className={styles.edit}
                    onClick={() => setEditing(profile)}
                    aria-label={`Edit ${profile.nickname}`}
                  >
                    Edit
                  </button>
                  <Link
                    className={styles.view}
                    to={`/dashboard?profile=${profile.id}`}
                    aria-label={`View ${profile.nickname} calendar`}
                  >
                    <Icon name="arrow" size={18} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Icon name="users" size={35} />
            </span>
            <h3>Make room for your people.</h3>
            <p>
              Create a profile to save period starts and build a calendar that
              learns from cycle history.
            </p>
            <button className="btn-primary" onClick={() => setEditing(null)}>
              <Icon name="plus" size={16} />
              Create your first profile
            </button>
            <Link to="/">
              Explore the guest calendar <Icon name="arrow" size={14} />
            </Link>
          </div>
        )}
      </section>
      <div className={styles.note}>
        <Icon name="flower" size={23} />
        <div>
          <strong>A rhythm of their own.</strong>
          <p>
            Each profile has its own history and cycle model. Its color helps
            you recognize it across your workspace.
          </p>
        </div>
      </div>
      {editing !== undefined && (
        <EditProfileModal
          key={editing?.id ?? 'new'}
          profile={editing}
          onClose={() => setEditing(undefined)}
          onSave={saved}
        />
      )}
    </div>
  );
}
