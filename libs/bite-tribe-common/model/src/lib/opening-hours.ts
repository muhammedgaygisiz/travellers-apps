export interface TimeRange {
  from: string;
  to: string;
}

export interface DaySchedule {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  isOpen: boolean;
  timeRanges: TimeRange[];
}
