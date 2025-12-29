import type { Profile, Cycle, CalendarDay } from './types';

const API_URL = '/api';

export async function getProfiles(): Promise<Profile[]> {
  const res = await fetch(`${API_URL}/profiles`);
  if (!res.ok) throw new Error('Failed to fetch profiles');
  return res.json();
}

export async function createProfile(data: { nickname: string; avatar_color: string; history?: string[] }): Promise<Profile> {
  const res = await fetch(`${API_URL}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create profile');
  return res.json();
}

export async function updateProfile(id: number, data: Partial<Profile>): Promise<void> {
  const res = await fetch(`${API_URL}/profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
}

export async function deleteProfile(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/profiles/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete profile');
}

export async function getCycles(profileId: number): Promise<Cycle[]> {
  const res = await fetch(`${API_URL}/profiles/${profileId}/cycles`);
  if (!res.ok) throw new Error('Failed to fetch cycles');
  return res.json();
}

export async function addCycle(profileId: number, startDate: string): Promise<void> {
  const res = await fetch(`${API_URL}/profiles/${profileId}/cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate }),
  });
  if (!res.ok) throw new Error('Failed to add cycle');
}

export async function updateCycle(id: number, startDate: string): Promise<void> {
  const res = await fetch(`${API_URL}/cycles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate }),
  });
  if (!res.ok) throw new Error('Failed to update cycle');
}

export async function deleteCycle(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/cycles/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete cycle');
}

export async function getCalendar(profileId: number, start: string, end: string): Promise<CalendarDay[]> {
  const res = await fetch(`${API_URL}/profiles/${profileId}/calendar?start=${start}&end=${end}`);
  if (!res.ok) throw new Error('Failed to fetch calendar');
  return res.json();
}

export async function getGuestCalendar(start: string, end: string, cycleStart?: string): Promise<CalendarDay[]> {
  let url = `${API_URL}/calendar/guest?start=${start}&end=${end}`;
  if (cycleStart) {
    url += `&cycleStart=${cycleStart}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch guest calendar');
  return res.json();
}
