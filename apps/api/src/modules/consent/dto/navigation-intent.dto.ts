import { InvocationMode } from '../enums/consent.enums';

/**
 * NavigationIntent DTO
 *
 * Represents the navigation intent after capability execution.
 * This guides the UI on where to navigate or what to display.
 */
export class NavigationIntentDto {
  /**
   * The target route to navigate to
   */
  targetRoute!: string;

  /**
   * Data to hydrate the target page with
   */
  hydrationData!: Record<string, unknown>;

  /**
   * Human-readable reason for navigation
   */
  reason!: string;

  /**
   * How the navigation should be invoked
   */
  invocationMode!: InvocationMode;

  /**
   * Optional query parameters for the route
   */
  queryParams?: Record<string, string>;

  /**
   * Whether this should replace the current history entry
   */
  replace?: boolean;

  constructor(partial: Partial<NavigationIntentDto>) {
    Object.assign(this, partial);
  }
}
