import type { CalendarDay, Cycle, Profile } from './types';

type ProfileInput = Pick<Profile, 'nickname' | 'avatar_color'> & {
  manual_cycle_length?: number | null;
  history?: string[];
};

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      response.status < 500 && typeof body?.error === 'string'
        ? body.error
        : 'Cyclelator could not complete the request. Please try again.';
    throw new Error(message);
  }
  return response;
}

function jsonRequest(method: 'PUT' | 'POST', data: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

export async function getProfiles(signal?: AbortSignal): Promise<Profile[]> {
  return (await request('/profiles', { signal })).json();
}

export async function createProfile(data: ProfileInput): Promise<Profile> {
  return (await request('/profiles', jsonRequest('POST', data))).json();
}

export async function updateProfile(
  id: number,
  data: Partial<ProfileInput>,
): Promise<void> {
  await request(`/profiles/${id}`, jsonRequest('PUT', data));
}

export async function reorderProfiles(ids: number[]): Promise<void> {
  await request('/profiles/reorder', jsonRequest('PUT', { ids }));
}

export async function deleteProfile(id: number): Promise<void> {
  await request(`/profiles/${id}`, { method: 'DELETE' });
}

export async function getCycles(
  profileId: number,
  signal?: AbortSignal,
): Promise<Cycle[]> {
  return (await request(`/profiles/${profileId}/cycles`, { signal })).json();
}

export async function addCycle(
  profileId: number,
  startDate: string,
): Promise<void> {
  await request(
    `/profiles/${profileId}/cycles`,
    jsonRequest('POST', { start_date: startDate }),
  );
}

export async function updateCycle(
  id: number,
  startDate: string,
): Promise<void> {
  await request(`/cycles/${id}`, jsonRequest('PUT', { start_date: startDate }));
}

export async function deleteCycle(id: number): Promise<void> {
  await request(`/cycles/${id}`, { method: 'DELETE' });
}

export async function getCalendar(
  profileId: number,
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<CalendarDay[]> {
  const query = new URLSearchParams({ start, end });
  return (
    await request(`/profiles/${profileId}/calendar?${query}`, { signal })
  ).json();
}

export async function getGuestCalendar(
  start: string,
  end: string,
  cycleStart?: string,
  signal?: AbortSignal,
): Promise<CalendarDay[]> {
  const query = new URLSearchParams({ start, end });
  if (cycleStart) query.set('cycleStart', cycleStart);
  return (await request(`/calendar/guest?${query}`, { signal })).json();
}
