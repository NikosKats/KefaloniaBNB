import { z } from 'zod';

const timeRegex = /^\d{2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const CreateRequestSchema = z.object({
  listing_id:       z.string().uuid(),
  booking_id:       z.string().uuid().optional(),
  requested_date:   z.string().regex(dateRegex),
  earliest_time:    z.string().regex(timeRegex).default('10:00'),
  latest_time:      z.string().regex(timeRegex).default('16:00'),
  notes:            z.string().max(1000).optional(),
  cleaning_type:    z.enum(['turnover', 'deep_clean', 'linen_change', 'inspection']).default('turnover'),
  urgency:          z.enum(['normal', 'urgent']).default('normal'),
  property_size:    z.number().int().positive().optional(),
  checklist_items:  z.array(z.string().min(1).max(200)).max(50).optional(),
  save_as_template: z.boolean().optional(),
  template_name:    z.string().max(100).optional(),
}).refine(d => d.earliest_time < d.latest_time, {
  message: 'latest_time must be after earliest_time',
  path: ['latest_time'],
});

export const SubmitBidSchema = z.object({
  request_id:    z.string().uuid(),
  proposed_price: z.number().positive(),
  proposed_time: z.string().regex(timeRegex).optional(),
  message:       z.string().max(500).optional(),
});

export const AcceptBidSchema = z.object({
  match_id: z.string().uuid(),
});

export const UpdateJobSchema = z.object({
  status:         z.enum(['scheduled','started','completed','approved','disputed','cancelled']).optional(),
  notes:          z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
});

export const UpdateCleanerProfileSchema = z.object({
  bio:       z.string().max(2000).optional(),
  languages: z.array(z.string().max(30)).max(10).optional(),
  is_active: z.boolean().optional(),
});

export const UpsertServiceSchema = z.object({
  id:             z.string().uuid().optional(),
  property_type:  z.string().max(50),
  bedrooms_min:   z.number().int().min(0).default(0),
  bedrooms_max:   z.number().int().min(0).default(10),
  base_price:     z.number().positive(),
  duration_hours: z.number().positive().max(24).default(3),
}).refine(d => d.bedrooms_max >= d.bedrooms_min, {
  message: 'bedrooms_max must be >= bedrooms_min',
  path: ['bedrooms_max'],
});

export const SetAvailabilitySchema = z.object({
  dates:        z.array(z.string().regex(dateRegex)).min(1).max(90),
  is_available: z.boolean(),
});

export const AddServiceAreaSchema = z.object({
  region: z.string().min(2).max(100),
  city:   z.string().max(100).optional(),
});

export const SubmitReviewSchema = z.object({
  job_id:  z.string().uuid(),
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const RaiseDisputeSchema = z.object({
  job_id: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export const ResolveDisputeSchema = z.object({
  resolution: z.string().min(5).max(2000),
  status:     z.enum(['resolved', 'escalated']),
});

export type CreateRequestInput      = z.infer<typeof CreateRequestSchema>;
export type SubmitBidInput          = z.infer<typeof SubmitBidSchema>;
export type AcceptBidInput          = z.infer<typeof AcceptBidSchema>;
export type UpdateJobInput          = z.infer<typeof UpdateJobSchema>;
export type UpdateCleanerProfileInput = z.infer<typeof UpdateCleanerProfileSchema>;
export type UpsertServiceInput      = z.infer<typeof UpsertServiceSchema>;
export type SetAvailabilityInput    = z.infer<typeof SetAvailabilitySchema>;
export type AddServiceAreaInput     = z.infer<typeof AddServiceAreaSchema>;
export type SubmitReviewInput       = z.infer<typeof SubmitReviewSchema>;
export type RaiseDisputeInput       = z.infer<typeof RaiseDisputeSchema>;
export type ResolveDisputeInput     = z.infer<typeof ResolveDisputeSchema>;
