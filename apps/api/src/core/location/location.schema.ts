import { z } from 'zod';

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  humanReadableName: z.string().trim().min(1).max(255),
  administrativeArea: z.string().trim().min(1).max(255),
  country: z.string().trim().min(1).max(100).default('Kenya'),
});

export type LocationInput = z.infer<typeof LocationSchema>;
