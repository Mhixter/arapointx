import { z } from 'zod';

export const bvnRetrieveSchema = z.object({
  bvn: z.string().length(11, 'BVN must be exactly 11 digits').regex(/^[0-9]+$/, 'BVN must contain only digits'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional(),
});

export const bvnDigitalCardSchema = z.object({
  bvn: z.string().length(11, 'BVN must be exactly 11 digits').regex(/^[0-9]+$/, 'BVN must contain only digits'),
});

export const bvnModifySchema = z.object({
  bvn: z.string().length(11, 'BVN must be exactly 11 digits').regex(/^[0-9]+$/, 'BVN must contain only digits'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional(),
  changeCategory: z.enum(['name', 'dob']),
  oldValue: z.string().min(1, 'Old value is required'),
  newValue: z.string().min(1, 'New value is required'),
  updateFields: z.object({
    phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional(),
    address: z.string().optional(),
  }).optional(),
});

export type BvnRetrieveInput = z.infer<typeof bvnRetrieveSchema>;
export type BvnDigitalCardInput = z.infer<typeof bvnDigitalCardSchema>;
export type BvnModifyInput = z.infer<typeof bvnModifySchema>;
