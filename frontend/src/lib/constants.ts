// URL de ton API PHP
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Configuration pagination
export const ITEMS_PER_PAGE = 12;

// Limites upload
export const MAX_PHOTOS = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Routes publiques (accessibles sans auth)
export const PUBLIC_ROUTES = ['/', '/explore', '/login', '/register'];