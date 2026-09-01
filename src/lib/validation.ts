import { z } from 'zod';

import { MAX_PARTICIPANTS, TIME_SLOTS } from '@/lib/site';

const TIME_LABELS = TIME_SLOTS.map((slot) => slot.label) as [
  string,
  ...string[],
];

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const bookingSchema = z
  .object({
    name: trimmed(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(60).optional().nullable(),
    company: z.string().trim().max(160).optional().nullable(),
    message: z.string().trim().max(2000).optional().nullable(),
    participants: z.coerce.number().int().min(1).max(MAX_PARTICIPANTS),
    sessionDate: isoDay,
    sessionTime: z.enum(TIME_LABELS),
    sessionDate2: isoDay.optional().nullable(),
    sessionTime2: z.enum(TIME_LABELS).optional().nullable(),
    teamAddon: z.boolean().default(false),
    refreshments: z.boolean().default(false),
    discountCode: z.string().trim().max(40).optional().nullable(),
    gratuityPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
    gratuityAmount: z.coerce.number().min(0).max(100_000).optional().nullable(),
  })
  .refine(
    (value) =>
      value.participants <= 12 ||
      (Boolean(value.sessionDate2) && Boolean(value.sessionTime2)),
    {
      message:
        'Groups larger than 12 run across two sessions — a second date and time is required.',
      path: ['sessionDate2'],
    }
  );

export type BookingRequest = z.infer<typeof bookingSchema>;

export const giftSchema = z.object({
  recipientName: trimmed(120),
  recipientEmail: z.string().trim().email().max(200).optional().nullable(),
  buyerEmail: z.string().trim().email().max(200),
  format: z.enum(['private', 'group']),
  sessions: z.coerce.number().int().min(1).max(4).default(1),
  participants: z.coerce
    .number()
    .int()
    .min(2)
    .max(MAX_PARTICIPANTS)
    .default(6),
  addons: z.record(z.string(), z.boolean()).default({}),
  gratuityPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  gratuityAmount: z.coerce.number().min(0).max(100_000).optional().nullable(),
});

export type GiftRequest = z.infer<typeof giftSchema>;

export const discoveryCallSchema = z.object({
  name: trimmed(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  callDate: isoDay,
  callTime: trimmed(40),
  message: z.string().trim().max(1000).optional().nullable(),
});

export type DiscoveryCallRequest = z.infer<typeof discoveryCallSchema>;

export const rescheduleCallSchema = z.object({
  token: z.string().uuid(),
  callDate: isoDay,
  callTime: trimmed(40),
});

export type RescheduleCallRequest = z.infer<typeof rescheduleCallSchema>;

export const contactSchema = z.object({
  name: trimmed(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).optional().nullable(),
  message: trimmed(2000),
});
