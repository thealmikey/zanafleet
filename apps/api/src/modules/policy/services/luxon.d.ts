declare module 'luxon' {
  export interface DurationLike {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
  }

  export interface DateTimeSetValues {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  }

  export class DateTime {
    static fromJSDate(date: Date, options?: { zone?: string }): DateTime;
    static fromISO(text: string, options?: { zone?: string }): DateTime;
    static now(): DateTime;

    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly weekday: number; // 1 = Monday, 7 = Sunday
    readonly day: number;
    readonly month: number;
    readonly year: number;

    toJSDate(): Date;
    toISO(): string | null;
    setZone(zone: string): DateTime;
    plus(duration: DurationLike): DateTime;
    minus(duration: DurationLike): DateTime;
    startOf(unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second'): DateTime;
    endOf(unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second'): DateTime;
    set(values: DateTimeSetValues): DateTime;
  }
}
