/**
 * Centralized theme constants for consistent branding
 * Eliminates hardcoded color duplication across components
 */

export const THEME = {
  // Primary colors
  PRIMARY: '#1F5F7B',      // Main brand color (brown)
  PRIMARY_DARK: '#174B62', // Hover state
  PRIMARY_LIGHT: '#E3EDF2', // Light background
  
  // Neutral colors
  DARK: '#111A22',         // Darkest text
  MEDIUM: '#46525E',       // Medium text
  LIGHT: '#7A8794',        // Light text
  LIGHTER: '#E3E7EC',      // Borders
  BG: '#F4F5F7',           // Page background
  
  // Status colors
  SUCCESS: '#22c55e',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
  
  // Extended palette
  RED: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
  },
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6',
    400: '#9ca3af',
    900: '#111827',
  },
} as const;

// Tailwind-compatible color aliases for easier usage
export const COLORS = {
  bg: {
    primary: THEME.BG,
    secondary: THEME.PRIMARY_LIGHT,
  },
  text: {
    dark: THEME.DARK,
    medium: THEME.MEDIUM,
    light: THEME.LIGHT,
  },
  border: {
    light: THEME.LIGHTER,
  },
  button: {
    primary: THEME.PRIMARY,
    primaryHover: THEME.PRIMARY_DARK,
  },
} as const;

export type Theme = typeof THEME;
export type Colors = typeof COLORS;
