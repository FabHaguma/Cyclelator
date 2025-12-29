export interface Profile {
  id: number;
  nickname: string;
  avatar_color: string;
  display_order: number;
  manual_cycle_length: number | null;
  created_at: string;
}

export interface Cycle {
  id: number;
  profile_id: number;
  start_date: string;
  computed_length: number | null;
}

export interface CalendarDay {
  date: string;
  isDangerous: boolean;
  isOvulation: boolean;
  isPeriodStart: boolean;
  isPeriodDay: boolean;
  isProjected: boolean;
}
