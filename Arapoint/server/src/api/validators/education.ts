import { z } from 'zod';

export const jambSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()).optional(),
});

export const waecSchema = z.object({
  registrationNumber: z.string().min(5, 'Examination number is required'),
  examYear: z.number().min(2000).max(2026),
  examType: z.enum(['WASSCE', 'GCE']).default('WASSCE'),
  cardSerialNumber: z.string().min(10, 'Card serial number is required').optional(),
  cardPin: z.string().min(10, 'Card PIN is required').optional(),
});

export const necoSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()),
  examType: z.enum(['school_candidate', 'private_candidate']).default('school_candidate'),
  cardPin: z.string().min(10, 'Token is required for NECO result checking'),
});

export const nabtebSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(1997).max(new Date().getFullYear()),
  examType: z.string().default('01'),
  cardSerialNumber: z.string().min(2, 'Card serial number is required').optional(),
  cardPin: z.string().min(2, 'Card PIN is required').optional(),
});

export const nbaisSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()),
  examType: z.string().optional(),
  state: z.string().optional(),
  schoolName: z.string().optional(),
  examMonth: z.string().optional(),
  cardSerialNumber: z.string().optional(),
  cardPin: z.string().min(4, 'Card PIN is required'),
});

export type JambInput = z.infer<typeof jambSchema>;
export type WaecInput = z.infer<typeof waecSchema>;
export type NecoInput = z.infer<typeof necoSchema>;
export type NabtebInput = z.infer<typeof nabtebSchema>;
export type NbaisInput = z.infer<typeof nbaisSchema>;
