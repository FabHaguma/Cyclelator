import 'dotenv/config';
import sqlite3 from 'sqlite3';
import path from 'path';

const filename = process.env.DB_PATH || path.resolve(__dirname, '../cyclelator.db');
const db = new sqlite3.Database(filename);
db.configure('busyTimeout', 5000);

type Binding = string | number | null;

export function all<T>(sql: string, params: Binding[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows as T[]));
  });
}

export function run(sql: string, params: Binding[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
  });
}

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    avatar_color TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    manual_cycle_length INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    computed_length INTEGER,
    FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS cycles_profile_date ON cycles(profile_id, start_date);
`;

export const ready = new Promise<void>((resolve, reject) => {
  db.exec(schema, err => err ? reject(err) : resolve());
});

let pending: Promise<void> = Promise.resolve();

// SQLite transactions belong to the connection. Queue whole requests so a second
// request cannot accidentally read or write inside another request's transaction.
export function withDatabase<T>(write: boolean, work: () => Promise<T>): Promise<T> {
  const result = pending.then(async () => {
    await ready;
    await run(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try {
      const value = await work();
      await run('COMMIT');
      return value;
    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }
  });
  pending = result.then(() => {}, () => {});
  return result;
}

export async function refreshLengths(profileId: number) {
  await run(`UPDATE cycles AS current SET computed_length = (
    SELECT CAST(julianday(MIN(following.start_date)) - julianday(current.start_date) AS INTEGER)
    FROM cycles AS following
    WHERE following.profile_id = current.profile_id AND following.start_date > current.start_date
  ) WHERE profile_id = ?`, [profileId]);
}
