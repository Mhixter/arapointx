import { z } from 'zod';

export const jambSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()).optional(),
});

export const waecSchema = z.object({
  registrationNumber: z.string().min(5, 'Examination number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()),
  examType: z.enum(['WASSCE', 'GCE']).default('WASSCE'),
  cardSerialNumber: z.string().min(10, 'Card serial number is required').optional(),
  cardPin: z.string().min(10, 'Card PIN is required').optional(),
});

export const necoSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()).optional(),
});

export const nabtebSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()).optional(),
});

export const nbaisSchema = z.object({
  registrationNumber: z.string().min(5, 'Registration number is required'),
  examYear: z.number().min(2000).max(new Date().getFullYear()).optional(),
});

export type JambInput = z.infer<typeof jambSchema>;
export type WaecInput = z.infer<typeof waecSchema>;
export type NecoInput = z.infer<typeof necoSchema>;
export type NabtebInput = z.infer<typeof nabtebSchema>;
export type NbaisInput = z.infer<typeof nbaisSchema>;
