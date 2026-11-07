import { z } from 'zod';
import { query } from '../db';

export const settingsSchema = z.object({
  site_name: z.string().min(1).max(100),
  site_url: z.string().max(255),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().max(500),
  max_file_size: z.number().int().positive(),
  max_photos_per_memory: z.number().int().min(1).max(50),
  enable_registrations: z.boolean(),
  enable_comments: z.boolean(),
  require_email_verification: z.boolean(),
  daily_email_limit: z.number().int().min(0),
  memory_moderation_required: z.boolean(),
  auto_delete_reports_after_days: z.number().int().min(0),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  site_name: 'Travel Memories',
  site_url: 'http://localhost:3000',
  maintenance_mode: false,
  maintenance_message: 'Le site est en maintenance, revenez bientôt !',
  max_file_size: 5,
  max_photos_per_memory: 10,
  enable_registrations: true,
  enable_comments: true,
  require_email_verification: false,
  daily_email_limit: 100,
  memory_moderation_required: false,
  auto_delete_reports_after_days: 30,
};

let cache: { value: Settings; at: number } | null = null;
const TTL_MS = 5000;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const rows = await query<{ key: string; value: unknown }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = settingsSchema.partial().parse(stored);
  const value = { ...DEFAULT_SETTINGS, ...merged } as Settings;
  cache = { value, at: Date.now() };
  return value;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  for (const [key, value] of Object.entries(patch)) {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  }
  cache = null;
  return getSettings();
}

export function clearSettingsCache() {
  cache = null;
}
