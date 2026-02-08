declare module 'luxon' {
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
  }
}
