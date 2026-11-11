import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { createProfile, deleteProfile, getCycles, updateProfile } from '../api';
import type { Profile } from '../types';
import styles from './EditProfileModal.module.css';

interface Props {
  profile: Profile | null;
  onClose: () => void;
  onSave: (message: string) => void;
}

const palette = [
  ['Iris', '#8064a4'],
  ['Rose', '#bc718b'],
  ['Terracotta', '#bb765b'],
  ['Ochre', '#ac8845'],
  ['Sage', '#729382'],
  ['Ocean', '#688bab'],
];

type DateEntry = { key: number; date: string };

export default function EditProfileModal({ profile, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const nextKey = useRef(-1);
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [color, setColor] = useState(profile?.avatar_color ?? palette[0][1]);
  const [length, setLength] = useState(
    profile?.manual_cycle_length?.toString() ?? '',
  );
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(Boolean(profile));
  const [historyError, setHistoryError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current!;
    const oldOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    getCycles(profile.id, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setDates(rows.map((row) => ({ key: row.id, date: row.start_date })));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingHistory(false);
      });
    return () => controller.abort();
  }, [profile, retry]);

  useEffect(() => {
    if (confirmDelete) cancelDelete.current?.focus();
  }, [confirmDelete]);

  function changeDates(entries: DateEntry[]) {
    setDates(entries);
    setError('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('nickname') || '').trim();
    const history = form.getAll('periodStart').map(String);
    if (!name) {
      setError('Enter a nickname to save this profile.');
      return;
    }
    if (new Set(history).size !== history.length) {
      setError('Each period start date must be different.');
      return;
    }
    const values = {
      nickname: name,
      avatar_color: color,
      manual_cycle_length:
        form.get('cycleLength') === '' ? null : Number(form.get('cycleLength')),
    };
    setError('');
    setSaving(true);
    try {
      if (profile) {
        await updateProfile(
          profile.id,
          historyError ? values : { ...values, history },
        );
      } else {
        await createProfile({ ...values, history });
      }
      onSave(profile ? 'Profile updated.' : 'Profile created.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save this profile. Please try again.',
      );
      setSaving(false);
    }
  }

  async function remove() {
    if (!profile || saving) return;
    setSaving(true);
    setError('');
    try {
      await deleteProfile(profile.id);
      onSave('Profile deleted.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not delete this profile. Please try again.',
      );
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="profile-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div className={styles.heading}>
        <h2 id="profile-editor-title">
          {confirmDelete
            ? 'Delete profile?'
            : profile
              ? 'Edit profile'
              : 'New profile'}
        </h2>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Close profile dialog"
          onClick={onClose}
          disabled={saving}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {confirmDelete && profile ? (
        <>
          <div className={styles.content}>
            <p className={styles.deleteNote}>
              Deleting <strong>{profile.nickname}</strong> permanently removes
              this profile and all its recorded period starts.
            </p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
          <div className={styles.footer}>
            <button
              ref={cancelDelete}
              type="button"
              className={styles.secondary}
              disabled={saving}
              onClick={() => {
                setConfirmDelete(false);
                setError('');
              }}
            >
              Keep profile
            </button>
            <button
              type="button"
              className={styles.danger}
              disabled={saving}
              onClick={remove}
            >
              {saving ? 'Deleting…' : 'Delete profile'}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={save} className={styles.form}>
          <div className={styles.content}>
            <label className={styles.field}>
              <span>Nickname</span>
              <input
                name="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter a nickname"
                required
                autoComplete="off"
                disabled={saving}
              />
            </label>
            <fieldset className={styles.colors} disabled={saving}>
              <legend>Profile color</legend>
              <div className={styles.swatches}>
                {palette.map(([name, value]) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={name}
                    title={name}
                    aria-pressed={color.toLowerCase() === value}
                    className={styles.swatch}
                    style={{ '--swatch': value } as CSSProperties}
                    onClick={() => setColor(value)}
                  >
                    {color.toLowerCase() === value && (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m5.5 12 4 4 9-9" />
                      </svg>
                    )}
                  </button>
                ))}
                <label
                  className={styles.customColor}
                  title="Choose a custom color"
                >
                  <span aria-hidden="true">+</span>
                  <input
                    type="color"
                    aria-label="Custom profile color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                  />
                  {!palette.some(
                    ([, value]) => value === color.toLowerCase(),
                  ) && (
                    <i aria-hidden="true" style={{ backgroundColor: color }} />
                  )}
                </label>
              </div>
            </fieldset>
            <section
              className={styles.history}
              aria-labelledby="profile-history-title"
            >
              <h3 id="profile-history-title">Period start dates</h3>
              <p>
                {profile
                  ? 'Add or correct a recorded start date.'
                  : 'Add up to three past starts, or leave this for later.'}
              </p>
              {loadingHistory ? (
                <p role="status">Loading dates…</p>
              ) : historyError ? (
                <div className={styles.historyFailure}>
                  <span>Cycle history could not be loaded.</span>
                  <button
                    type="button"
                    className={styles.textButton}
                    disabled={saving}
                    onClick={() => {
                      setHistoryError(false);
                      setLoadingHistory(true);
                      setRetry((n) => n + 1);
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  {dates.map((entry, index) => (
                    <div key={entry.key} className={styles.dateRow}>
                      <input
                        type="date"
                        name="periodStart"
                        aria-label={`Period start ${index + 1}`}
                        value={entry.date}
                        required
                        disabled={saving}
                        onChange={(event) =>
                          changeDates(
                            dates.map((item) =>
                              item.key === entry.key
                                ? { ...item, date: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Remove period start ${index + 1}`}
                        disabled={saving}
                        className={styles.iconButton}
                        onClick={() =>
                          changeDates(
                            dates.filter((item) => item.key !== entry.key),
                          )
                        }
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {(profile || dates.length < 3) && (
                    <button
                      className={styles.addDate}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        changeDates([
                          ...dates,
                          { key: nextKey.current--, date: '' },
                        ])
                      }
                    >
                      <span aria-hidden="true">+</span> Add a date
                    </button>
                  )}
                </>
              )}
            </section>
            <label className={styles.field}>
              <span>
                Fixed cycle length <small>Optional</small>
              </span>
              <span className={styles.help}>
                Leave empty to use the automatic estimate.
              </span>
              <span className={styles.length}>
                <input
                  type="number"
                  name="cycleLength"
                  min="15"
                  max="366"
                  step="1"
                  inputMode="numeric"
                  placeholder="Auto"
                  value={length}
                  disabled={saving}
                  onChange={(e) => setLength(e.target.value)}
                />
                <span>days</span>
              </span>
            </label>
            {profile && (
              <button
                type="button"
                className={styles.deleteLink}
                disabled={saving}
                onClick={() => {
                  setConfirmDelete(true);
                  setError('');
                }}
              >
                Delete this profile
              </button>
            )}
          </div>
          {error && (
            <div className={styles.footerError} role="alert">
              {error}
            </div>
          )}
          <div className={styles.footer}>
            <button
              className={styles.secondary}
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className={styles.primary}
              type="submit"
              disabled={saving || loadingHistory}
            >
              {saving ? 'Saving…' : profile ? 'Save changes' : 'Create profile'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
