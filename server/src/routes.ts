import express from 'express';
import db from './db';
import { Profile, Cycle } from './types';
import { getCycleStatus } from './logic';

const router = express.Router();

// Helper to wrap db.all in promise
function dbAll<T>(query: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

function dbRun(query: string, params: any[] = []): Promise<{ id: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
}

function dbGet<T>(query: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

// Profiles
router.get('/profiles', async (req, res) => {
  try {
    const profiles = await dbAll<Profile>('SELECT * FROM profiles ORDER BY display_order ASC');
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profiles', async (req, res) => {
  const { nickname, avatar_color, history } = req.body;
  try {
    const result = await dbRun(
      'INSERT INTO profiles (nickname, avatar_color) VALUES (?, ?)',
      [nickname, avatar_color]
    );
    const profileId = result.id;

    if (history && Array.isArray(history)) {
      for (const date of history) {
        await dbRun('INSERT INTO cycles (profile_id, start_date) VALUES (?, ?)', [profileId, date]);
      }
    }

    res.json({ id: profileId, nickname, avatar_color });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profiles/:id', async (req, res) => {
  const { nickname, avatar_color, manual_cycle_length } = req.body;
  const { id } = req.params;
  try {
    await dbRun(
      'UPDATE profiles SET nickname = ?, avatar_color = ?, manual_cycle_length = ? WHERE id = ?',
      [nickname, avatar_color, manual_cycle_length, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/profiles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbRun('DELETE FROM profiles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cycles
router.get('/profiles/:id/cycles', async (req, res) => {
  const { id } = req.params;
  try {
    const cycles = await dbAll<Cycle>('SELECT * FROM cycles WHERE profile_id = ? ORDER BY start_date DESC', [id]);
    res.json(cycles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profiles/:id/cycles', async (req, res) => {
  const { id } = req.params;
  const { start_date } = req.body;
  try {
    await dbRun('INSERT INTO cycles (profile_id, start_date) VALUES (?, ?)', [id, start_date]);
    // Recalculation happens on read or we could update computed_length here.
    // PRD says "Previous cycle length is computed... Historical data is updated".
    // We can implement a trigger or just calculate on the fly.
    // For now, let's just insert.
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/cycles/:id', async (req, res) => {
  const { id } = req.params;
  const { start_date } = req.body;
  try {
    await dbRun('UPDATE cycles SET start_date = ? WHERE id = ?', [start_date, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cycles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbRun('DELETE FROM cycles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calendar
router.get('/profiles/:id/calendar', async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params required' });
  }

  try {
    const profile = await dbGet<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const cycles = await dbAll<Cycle>('SELECT * FROM cycles WHERE profile_id = ?', [id]);
    
    const calendar = [];
    const [startYear, startMonth, startDay] = (start as string).split('-').map(Number);
    const [endYear, endMonth, endDay] = (end as string).split('-').map(Number);
    let current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const status = getCycleStatus(profile, cycles, dateStr);
      calendar.push(status);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    res.json(calendar);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Guest Calendar
router.get('/calendar/guest', async (req, res) => {
  const { start, end, cycleStart } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params required' });
  }

  try {
    const profile: Profile = {
      id: 0,
      nickname: 'Guest',
      avatar_color: '#000000',
      display_order: 0,
      manual_cycle_length: null,
      created_at: new Date().toISOString()
    };

    const cycles: Cycle[] = cycleStart ? [{ id: 0, profile_id: 0, start_date: cycleStart as string, computed_length: null }] : [];
    
    const calendar = [];
    const [startYear, startMonth, startDay] = (start as string).split('-').map(Number);
    const [endYear, endMonth, endDay] = (end as string).split('-').map(Number);
    let current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    console.log('Guest calendar request:', { start, end, cycleStart });

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const status = getCycleStatus(profile, cycles, dateStr);
      calendar.push(status);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    console.log('Generated', calendar.length, 'days');
    res.json(calendar);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
