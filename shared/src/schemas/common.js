import { z } from 'zod';
import { isValidDateString, isValidTimeZone } from '../time.js';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12, 'at least 12 characters').max(128);
export const timeZoneSchema = z.string().refine(isValidTimeZone, 'invalid IANA timezone');
export const localeSchema = z.enum(['bn', 'en']);
export const dateStringSchema = z.string().refine(isValidDateString, 'invalid calendar date (YYYY-MM-DD)');
export const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:mm');
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'invalid id');
