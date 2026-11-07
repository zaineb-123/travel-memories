/**
 * Enhanced validation schemas with file upload support
 */
import { z } from 'zod';

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Validation Login
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (min 6 caractères)'),
});

// Validation Register
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username trop court (min 3 caractères)')
    .max(50, 'Username trop long (max 50 caractères)')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username ne peut contenir que des lettres, chiffres et underscore'),
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Mot de passe trop court (min 8 caractères)')
    .regex(/[A-Z]/, 'Au moins une lettre majuscule requise')
    .regex(/[0-9]/, 'Au moins un chiffre requis'),
  full_name: z.string().min(2, 'Nom trop court (min 2 caractères)').max(100, 'Nom trop long'),
});

// Validation Memory
export const memorySchema = z.object({
  title: z.string()
    .min(3, 'Titre trop court (min 3 caractères)')
    .max(100, 'Titre trop long (max 100 caractères)'),
  description: z.string()
    .min(10, 'Description trop courte (min 10 caractères)')
    .max(2000, 'Description trop longue (max 2000 caractères)'),
  country: z.string().min(2, 'Pays requis').max(50, 'Nom de pays trop long'),
  city: z.string().max(50, 'Nom de ville trop long').optional(),
  travel_date: z.string().min(1, 'Date de voyage requise'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location_name: z.string().optional(),
  visibility: z.enum(['public', 'private', 'followers']),
  tags: z.array(z.string()).optional(),
});

// File validation
export const fileValidationSchema = z.object({
  size: z.number().max(MAX_FILE_SIZE, `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`),
  type: z.string().refine(
    (type) => ACCEPTED_IMAGE_TYPES.includes(type),
    `Format non accepté. Acceptés: ${ACCEPTED_IMAGE_TYPES.join(', ')}`
  ),
});

// Validation Profile
export const profileSchema = z.object({
  full_name: z.string()
    .min(2, 'Nom trop court')
    .max(100, 'Nom trop long'),
  bio: z.string().max(500, 'Bio trop longue').optional(),
  avatar_url: z.string().url('URL invalide').optional(),
  country: z.string().max(50, 'Pays trop long').optional(),
  city: z.string().max(50, 'Ville trop long').optional(),
});

// API Response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MemoryInput = z.infer<typeof memorySchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type FileValidation = z.infer<typeof fileValidationSchema>;

// Validation helpers
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  try {
    fileValidationSchema.parse({
      size: file.size,
      type: file.type,
    });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0].message };
    }
    return { valid: false, error: 'Erreur de validation inconnue' };
  }
};

export const VALIDATION_LIMITS = {
  MAX_FILE_SIZE,
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTOS: 10,
  MAX_PHOTOS_SIZE: 50 * 1024 * 1024, // 50MB total
} as const;