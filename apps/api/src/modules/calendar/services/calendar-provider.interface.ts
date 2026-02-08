import { CalendarEventType } from '@zanafleet/contracts';

/**
 * Represents an event from an external calendar source.
 */
export interface ExternalCalendarEvent {
  externalId: string;
  source: string;
  eventType: CalendarEventType;
  title: string;
  startTime: Date;
  endTime: Date;
  regionScope?: {
    country: string;
    administrativeArea?: string;
  };
  recurrenceRule?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for fetching events from an external provider.
 */
export interface FetchEventsOptions {
  startDate: Date;
  endDate: Date;
  region?: string;
}

/**
 * Result of syncing events to a calendar.
 */
export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
}

/**
 * Interface for external calendar providers.
 * Implementations can connect to Google Calendar, government holiday APIs,
 * static holiday feeds, or any other external event source.
 */
export interface CalendarProviderInterface {
  readonly providerName: string;
  readonly supportedEventTypes: CalendarEventType[];

  fetchEvents(options: FetchEventsOptions): Promise<ExternalCalendarEvent[]>;

  syncToCalendar(
    events: ExternalCalendarEvent[],
    targetCalendarId: string,
  ): Promise<SyncResult>;
}
