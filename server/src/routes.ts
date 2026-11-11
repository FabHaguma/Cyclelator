import express, { type Request, type RequestHandler, type ErrorRequestHandler } from 'express';
import { all, run, withDatabase, refreshLengths } from './db';
import { getCalendar, isCalendarDate } from './logic';
import { Profile, Cycle } from './types';

const router = express.Router();
class InputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function databaseRoute(work: (req: Request) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    const data = await withDatabase(req.method !== 'GET', () => work(req));
    res.json(data);
  };
}

function parseId(value: unknown) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new InputError('Choose a valid record.');
  return id;
}

function parseDate(value: unknown) {
  if (!isCalendarDate(value)) throw new InputError('Enter a valid calendar date.');
  return value;
}

function parseRange(req: Request) {
  const start = parseDate(req.query.start);
  const end = parseDate(req.query.end);
  if (end < start || Date.parse(end) - Date.parse(start) > 3660 * 86_400_000) {
    throw new InputError('Choose a date range of up to ten years in chronological order.');
  }
  return { start, end };
}

function parseHistory(value: unknown, creating = false): string[] {
  if (!Array.isArray(value)) throw new InputError('Provide a list of period start dates.');
  if (creating && value.length > 3) throw new InputError('Choose up to three past starts to create a profile.');
  const dates = value.map(parseDate);
  if (new Set(dates).size !== dates.length) throw new InputError('Each period start date must be different.');
  return dates;
}

async function profileById(id: number) {
  const [profile] = await all<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
  if (!profile) throw new InputError('This profile no longer exists.', 404);
  return profile;
}

async function cycleById(id: number) {
  const [cycle] = await all<Cycle>('SELECT * FROM cycles WHERE id = ?', [id]);
  if (!cycle) throw new InputError('This period start no longer exists.', 404);
  return cycle;
}

function listCycles(id: number) {
  return all<Cycle>('SELECT * FROM cycles WHERE profile_id = ? ORDER BY start_date DESC, id', [id]);
}

function profileFields(body: Partial<Profile>, current?: Profile) {
  const nickname = body.nickname === undefined ? current?.nickname : body.nickname;
  const color = body.avatar_color === undefined ? current?.avatar_color : body.avatar_color;
  const length = body.manual_cycle_length === undefined ? current?.manual_cycle_length ?? null : body.manual_cycle_length;
  if (typeof nickname !== 'string' || !nickname.trim()) throw new InputError('Enter a nickname.');
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) throw new InputError('Choose a valid avatar color.');
  if (length !== null && (!Number.isSafeInteger(length) || length < 15 || length > 366)) {
    throw new InputError('Enter a whole cycle length between 15 and 366 days.');
  }
  return { nickname: nickname.trim(), color, length };
}

// Preserve the record IDs of unchanged dates, including when profiles are renamed.
async function replaceHistory(profileId: number, dates: string[]) {
  const missing = new Set(dates);
  for (const cycle of await listCycles(profileId)) {
    if (!missing.delete(cycle.start_date)) await run('DELETE FROM cycles WHERE id = ?', [cycle.id]);
  }
  for (const date of missing) {
    await run('INSERT INTO cycles (profile_id, start_date) VALUES (?, ?)', [profileId, date]);
  }
  await refreshLengths(profileId);
}

async function checkDuplicate(profileId: number, date: string, exceptId = 0) {
  const rows = await all('SELECT id FROM cycles WHERE profile_id = ? AND start_date = ? AND id != ? LIMIT 1',
    [profileId, date, exceptId]);
  if (rows.length) throw new InputError('This period start is already in the history.', 409);
}

router.get('/profiles', databaseRoute(async () => all<Profile>('SELECT * FROM profiles ORDER BY display_order, id')));

router.post('/profiles', databaseRoute(async req => {
  const body = req.body ?? {};
  const { nickname, color, length } = profileFields(body);
  const dates = parseHistory(body.history ?? [], true);
  const result = await run(`INSERT INTO profiles (nickname, avatar_color, manual_cycle_length, display_order)
    SELECT ?, ?, ?, COALESCE(MAX(display_order), -1) + 1 FROM profiles`, [nickname, color, length]);
  await replaceHistory(result.lastID, dates);
  return profileById(result.lastID);
}));

router.put('/profiles/reorder', databaseRoute(async req => {
  const ids: unknown = req.body?.ids;
  if (!Array.isArray(ids) || !ids.every(id => Number.isSafeInteger(id) && id > 0) || new Set(ids).size !== ids.length) {
    throw new InputError('Provide an ordered list of unique profile IDs.');
  }
  const profiles = await all<{ id: number }>('SELECT id FROM profiles');
  const requested = new Set(ids);
  if (profiles.length !== ids.length || !profiles.every(p => requested.has(p.id))) {
    throw new InputError('The profile list has changed. Refresh it and try again.', 409);
  }
  for (const [position, id] of ids.entries()) {
    await run('UPDATE profiles SET display_order = ? WHERE id = ?', [position, id]);
  }
  return { success: true };
}));

router.put('/profiles/:id', databaseRoute(async req => {
  const id = parseId(req.params.id);
  const body = req.body ?? {};
  const { nickname, color, length } = profileFields(body, await profileById(id));
  const dates = body.history === undefined ? undefined : parseHistory(body.history);
  await run('UPDATE profiles SET nickname = ?, avatar_color = ?, manual_cycle_length = ? WHERE id = ?',
    [nickname, color, length, id]);
  if (dates) await replaceHistory(id, dates);
  return { success: true };
}));

router.delete('/profiles/:id', databaseRoute(async req => {
  const id = parseId(req.params.id);
  await profileById(id);
  await run('DELETE FROM profiles WHERE id = ?', [id]);
  return { success: true };
}));

router.get('/profiles/:id/cycles', databaseRoute(async req => {
  const id = parseId(req.params.id);
  await profileById(id);
  return listCycles(id);
}));

router.post('/profiles/:id/cycles', databaseRoute(async req => {
  const id = parseId(req.params.id);
  const date = parseDate(req.body?.start_date);
  await profileById(id);
  await checkDuplicate(id, date);
  await run('INSERT INTO cycles (profile_id, start_date) VALUES (?, ?)', [id, date]);
  await refreshLengths(id);
  return { success: true };
}));

router.put('/cycles/:id', databaseRoute(async req => {
  const id = parseId(req.params.id);
  const date = parseDate(req.body?.start_date);
  const cycle = await cycleById(id);
  await checkDuplicate(cycle.profile_id, date, id);
  await run('UPDATE cycles SET start_date = ? WHERE id = ?', [date, id]);
  await refreshLengths(cycle.profile_id);
  return { success: true };
}));

router.delete('/cycles/:id', databaseRoute(async req => {
  const id = parseId(req.params.id);
  const cycle = await cycleById(id);
  await run('DELETE FROM cycles WHERE id = ?', [id]);
  await refreshLengths(cycle.profile_id);
  return { success: true };
}));

router.get('/profiles/:id/calendar', databaseRoute(async req => {
  const id = parseId(req.params.id);
  const { start, end } = parseRange(req);
  return getCalendar(await profileById(id), await listCycles(id), start, end);
}));

const guest: Profile = { id: 0, nickname: 'Guest', avatar_color: '#000000', display_order: 0,
  manual_cycle_length: null, created_at: '' };

router.get('/calendar/guest', (req, res) => {
  const { start, end } = parseRange(req);
  const cycles = req.query.cycleStart === undefined ? [] : [
    { id: 0, profile_id: 0, start_date: parseDate(req.query.cycleStart), computed_length: null }
  ];
  res.json(getCalendar(guest, cycles, start, end));
});

const handleError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof InputError) {
    res.status(err.status).json({ error: err.message });
  } else if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('profiles.nickname')) {
    res.status(409).json({ error: 'A profile already uses that nickname.' });
  } else {
    console.error('Cyclelator API error:', err.code ?? err.name);
    res.status(500).json({ error: 'Unable to complete this request. Please try again.' });
  }
};
router.use(handleError);

export default router;
