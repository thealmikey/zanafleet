import { Injectable } from '@nestjs/common';

export interface DeliveryMessageInput {
  order?: {
    itemSummary?: string | null;
  } | null;
  delivery?: {
    scheduledDropoffTime?: Date | string | null;
    calculatedEta?: Date | string | null;
  } | null;
  rider?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  business?: {
    businessName?: string | null;
    phone?: string | null;
  } | null;
}

/**
 * Formats a Date or ISO string into a deterministic UTC "YYYY-MM-DD HH:mm" string.
 * Returns null if the input is missing or invalid.
 */
function formatDateTimeUTC(input: Date | string | null | undefined): string | null {
  if (!input) return null;

  const date = typeof input === 'string' ? new Date(input) : input;
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return null;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Pure function to build the delivery narrative message.
 * This function has no side effects and is easy to unit test.
 */
export function buildDeliveryNarrative(input: DeliveryMessageInput): string {
  const itemSummary = clean(input.order?.itemSummary);
  const item = itemSummary.length > 0 ? itemSummary : 'order';

  const scheduled = input.delivery?.scheduledDropoffTime;
  const eta = input.delivery?.calculatedEta;
  const timeFormatted = formatDateTimeUTC(scheduled ?? eta) ?? 'the scheduled time';

  const riderNameClean = clean(input.rider?.name);
  const riderPhoneClean = clean(input.rider?.phone);
  const riderName = riderNameClean.length > 0 ? riderNameClean : 'your rider';
  const riderPhone = riderPhoneClean.length > 0 ? riderPhoneClean : 'N/A';

  const businessNameClean = clean(input.business?.businessName);
  const businessPhoneClean = clean(input.business?.phone);
  const businessName = businessNameClean.length > 0 ? businessNameClean : 'your business';
  const businessPhone = businessPhoneClean.length > 0 ? businessPhoneClean : 'N/A';

  return `Your ${item} from ${businessName} will be delivered at ${timeFormatted} by ${riderName} (${riderPhone}). Contact ${businessPhone} if needed.`;
}

@Injectable()
export class MessageBuilderService {
  buildDeliveryMessage(input: DeliveryMessageInput): string {
    return buildDeliveryNarrative(input);
  }
}
