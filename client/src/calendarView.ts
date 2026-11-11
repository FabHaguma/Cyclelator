import type { CalendarDay } from './types';

export function localDateKey(date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calendar entries are civil dates. Local noon keeps formatting independent of
// UTC midnight and daylight-saving changes near midnight.
export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function offsetDate(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function dayDifference(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
}

export function shiftMonth(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  return result;
}

export function monthRange(date: Date): { start: string; end: string } {
  const start = shiftMonth(date, 0);
  const end = shiftMonth(date, 1);
  end.setDate(0);
  return { start: localDateKey(start), end: localDateKey(end) };
}

export function formatDate(
  key: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
  return parseDateKey(key).toLocaleDateString('en-US', options);
}

export const phaseNames = {
  period: 'Period start',
  fertile: 'Fertile window',
  ovulation: 'Ovulation',
  neutral: 'Cycle day',
} as const;

export type DayPhase = keyof typeof phaseNames;

export function dayPhase(day?: CalendarDay): DayPhase {
  if (day?.isOvulation) return 'ovulation';
  if (day?.isDangerous) return 'fertile';
  if (day?.isPeriodStart || day?.isPeriodDay) return 'period';
  return 'neutral';
}

export function calendarWeeks(viewDate: Date) {
  const monthStart = shiftMonth(viewDate, 0);
  const cursor = new Date(monthStart);
  cursor.setDate(1 - monthStart.getDay());
  const nextMonth = shiftMonth(viewDate, 1);
  const weeks = [];

  while (cursor < nextMonth) {
    const week = [];
    for (let column = 0; column < 7; column++) {
      week.push({
        key: localDateKey(cursor),
        dayNumber: cursor.getDate(),
        inMonth: cursor >= monthStart && cursor < nextMonth,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function keyboardDate(date: string, key: string): string | undefined {
  const result = parseDateKey(date);
  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -result.getDay(),
    End: 6 - result.getDay(),
  };
  const offset = offsets[key];
  if (typeof offset !== 'number') return;
  result.setDate(result.getDate() + offset);
  return localDateKey(result);
}
