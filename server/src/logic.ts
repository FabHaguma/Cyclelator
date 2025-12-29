import { Profile, Cycle, CalendarDay } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function diffDays(d1: string, d2: string): number {
  const date1 = parseDate(d1);
  const date2 = parseDate(d2);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / MS_PER_DAY);
}

export function calculateCycleLength(profile: Profile, cycles: Cycle[]): number {
  // 1. Manual override
  if (profile.manual_cycle_length) {
    return profile.manual_cycle_length;
  }

  // Sort cycles by date descending
  const sortedCycles = [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));

  // We need computed lengths. 
  // If the cycles in DB already have computed_length, we can use that.
  // Otherwise we calculate it from start dates.
  // The PRD says "Previous cycle length is computed" on entry.
  // Let's assume we calculate dynamically from the list of start dates to be safe/robust.
  
  const lengths: number[] = [];
  // We need at least 2 dates to get 1 length.
  // sortedCycles[0] is the most recent start date (current cycle start).
  // sortedCycles[1] is the previous start date.
  // Length of cycle starting at sortedCycles[1] is (sortedCycles[0] - sortedCycles[1]).
  
  for (let i = 0; i < sortedCycles.length - 1; i++) {
    const current = sortedCycles[i];
    const previous = sortedCycles[i+1];
    const len = diffDays(previous.start_date, current.start_date);
    // Filter out abnormally long cycles (missed entries) to avoid skewing the average
    if (len <= 60) {
      lengths.push(len);
    }
  }

  // 2. Average of last 3 recorded cycles (if >= 3 exist)
  // lengths[0] is the most recent completed cycle length.
  if (lengths.length > 0) {
    const count = Math.min(lengths.length, 3);
    const lastN = lengths.slice(0, count);
    const sum = lastN.reduce((a, b) => a + b, 0);
    return Math.round(sum / count);
  }

  // 3. Standard Model
  return 28;
}

export function getCycleStatus(profile: Profile, cycles: Cycle[], targetDateStr: string): CalendarDay {
  // Find the cycle that covers the targetDate.
  // If targetDate is in the future relative to the last known start date, we project.
  
  const sortedCycles = [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const lastCycle = sortedCycles[0];

  if (!lastCycle) {
    // No data, assume standard model relative to... wait, if no data, what is the anchor?
    // PRD 3.1 Guest Mode: "User may input a Cycle Start Date".
    // If profile has no history, we can't really predict unless we have at least one start date.
    // PRD 3.2.1: "Optional historical cycle start dates".
    // If no history provided, Standard Model. But we need an anchor.
    // If absolutely no cycles, we can't render a cycle status.
    return {
      date: targetDateStr,
      isDangerous: false,
      isOvulation: false,
      isPeriodStart: false,
      isPeriodDay: false,
      isProjected: true
    };
  }

  const L = calculateCycleLength(profile, cycles);
  
  // Calculate days elapsed since last cycle start
  const daysSinceStart = diffDays(lastCycle.start_date, targetDateStr);
  
  // If targetDate is before the last cycle start, we should look at historical cycles.
  // But for simplicity, let's handle the "current/future" projection first.
  // Actually, we should find the relevant cycle start for the target date.
  
  let anchorDate = lastCycle.start_date;
  
  // If target is before the last recorded start, find the correct historical cycle
  if (targetDateStr < lastCycle.start_date) {
     const historic = sortedCycles.find(c => c.start_date <= targetDateStr);
     if (historic) {
       anchorDate = historic.start_date;
       // For historical cycles, the length is fixed by the next cycle start.
       // But for simplicity, let's use the calculated L for projection if we are strictly following "Predictability".
       // Actually, historical reality overrides prediction.
       // If we are in a past cycle, we know when it ended.
       // But the PRD says "UI components receive a fully precomputed calendar model".
       // And "Derived Values... Ovulation Day (O): L - 14".
       // Does this apply to past cycles too?
       // "Previous cycle length is computed... Historical data is updated".
       // So for past cycles, L is the actual length.
       // Let's try to find the actual length if it exists.
       const historicIndex = sortedCycles.findIndex(c => c.id === historic.id);
       if (historicIndex > 0) {
         const nextCycle = sortedCycles[historicIndex - 1];
         const actualLen = diffDays(historic.start_date, nextCycle.start_date);
         
         // If the gap is too large (missed entries), project standard cycles instead of one long cycle
         if (actualLen > 60) {
            const daysDiff = diffDays(historic.start_date, targetDateStr);
            const cycleIndex = Math.floor(daysDiff / L);
            const currentCycleStart = addDays(historic.start_date, cycleIndex * L);
            return calculateDayStatus(targetDateStr, currentCycleStart, L, true);
         }

         // Use actual length for this past cycle
         return calculateDayStatus(targetDateStr, historic.start_date, actualLen, false);
       }
     }
  }

  // If target is after last cycle start, we project using L.
  // We might be multiple cycles in the future.
  const daysDiff = (parseDate(targetDateStr).getTime() - parseDate(anchorDate).getTime()) / MS_PER_DAY;
  
  // Calculate which cycle iteration we are in
  const cycleIndex = Math.floor(daysDiff / L);
  const currentCycleStart = addDays(anchorDate, cycleIndex * L);
  
  // Determine if projected
  // If target is before last cycle start (and we didn't find historic), it's projected (pre-history).
  // If target is after last cycle start:
  //   cycleIndex 0 is the current cycle (recorded start).
  //   cycleIndex > 0 is future projection.
  let isProjected = false;
  if (targetDateStr < lastCycle.start_date) {
      isProjected = true; // Pre-history
  } else {
      isProjected = cycleIndex > 0;
  }

  return calculateDayStatus(targetDateStr, currentCycleStart, L, isProjected);
}

function calculateDayStatus(targetDate: string, cycleStart: string, L: number, isProjected: boolean): CalendarDay {
  const dayOfCycle = diffDays(cycleStart, targetDate); // 0-indexed? diffDays returns absolute difference.
  // If target is same as start, diff is 0.
  // Day 1 is start. So dayOfCycle 0 is Day 1.
  
  // Ovulation Day (O) = L - 14. (1-based day number)
  // In 0-based offset: O_offset = (L - 14) - 1?
  // Example: L=28. O = 14.
  // Day 1 = Jan 1.
  // Day 14 = Jan 14.
  // Offset = 13.
  // So O_offset = L - 14. (Wait. 28 - 14 = 14. Jan 1 + 14 days = Jan 15. That's Day 15.)
  // Let's check PRD. "Ovulation = Day 14 (L - 14)".
  // If L=28, O=14.
  // If Day 1 is Jan 1. Day 14 is Jan 14.
  // Jan 1 + 13 days = Jan 14.
  // So offset is O - 1.
  
  const ovulationDayIndex = (L - 14) - 1; 
  const currentDayIndex = (parseDate(targetDate).getTime() - parseDate(cycleStart).getTime()) / MS_PER_DAY;

  const isOvulation = currentDayIndex === ovulationDayIndex;
  
  // Dangerous Zone: O - 5 to O.
  // Indices: (ovulationDayIndex - 5) to ovulationDayIndex.
  const isDangerous = currentDayIndex >= (ovulationDayIndex - 5) && currentDayIndex <= ovulationDayIndex;
  
  const isPeriodStart = currentDayIndex === 0;
  
  return {
    date: targetDate,
    isDangerous,
    isOvulation,
    isPeriodStart,
    isPeriodDay: false, // Only first day is marked
    isProjected
  };
}
