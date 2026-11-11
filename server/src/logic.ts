import { CalendarDay, Cycle, Profile } from './types';

const DAY_MS = 86_400_000;
const STANDARD_LENGTH = 28;

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

// Date-only values use UTC throughout, so DST and server timezone never shift a day.
const dayNumber = (date: string) => Date.parse(date) / DAY_MS;
const dateString = (day: number) => new Date(day * DAY_MS).toISOString().split('T')[0];

function getModel(profile: Profile, starts: number[]) {
  const manual = profile.manual_cycle_length;
  if (manual !== null && Number.isSafeInteger(manual) && manual >= 15 && manual <= 366) {
    return { model: 'manual' as const, cycleLength: manual };
  }
  if (starts.length >= 4) {
    // The last four starts delimit the last three completed intervals.
    const last = starts.length - 1;
    return { model: 'adaptive' as const, cycleLength: Math.round((starts[last] - starts[last - 3]) / 3) };
  }
  return { model: 'standard' as const, cycleLength: STANDARD_LENGTH };
}

export function getCalendar(profile: Profile, cycles: Cycle[], start: string, end: string): CalendarDay[] {
  const starts = [...new Set(cycles.map(c => c.start_date).filter(isCalendarDate).map(dayNumber))]
    .sort((a, b) => a - b);
  const forecast = getModel(profile, starts);
  const days: CalendarDay[] = [];
  const endDay = dayNumber(end);
  let index = -1;
  for (let day = dayNumber(start); day <= endDay; day++) {
    while (index + 1 < starts.length && starts[index + 1] <= day) index++;
    const date = dateString(day);
    if (index < 0) {
      days.push({ date, ...forecast, cycleDay: null, nextPeriod: null, ovulationDate: null, fertileStart: null,
        isPeriodStart: false, isPeriodDay: false, isDangerous: false, isOvulation: false, isProjected: false });
      continue;
    }

    const lastStart = starts[index];
    // An observed following start determines the elapsed length of a closed cycle.
    const cycleLength = index + 1 < starts.length ? starts[index + 1] - lastStart : forecast.cycleLength;
    const elapsed = day - lastStart;
    const cycleDay = (elapsed % cycleLength) + 1;
    const cycleStart = day - cycleDay + 1;
    const ovulationDay = cycleLength - 14;
    const ovulation = cycleStart + ovulationDay - 1;
    const firstFertileDay = Math.max(cycleStart, ovulation - 5);
    days.push({
      date, cycleDay, cycleLength, model: forecast.model,
      nextPeriod: dateString(cycleStart + cycleLength),
      ovulationDate: ovulationDay >= 1 ? dateString(ovulation) : null,
      fertileStart: ovulationDay >= 1 ? dateString(firstFertileDay) : null,
      isOvulation: day === ovulation,
      isDangerous: day >= firstFertileDay && day <= ovulation,
      isPeriodStart: cycleDay === 1,
      isPeriodDay: false,
      isProjected: cycleStart > lastStart
    });
  }
  return days;
}
