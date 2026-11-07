/**
 * API error handling and response utilities
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Standardized API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      return String(error.message);
    }
    if ('response' in error && typeof error.response === 'object' && error.response !== null) {
      const response = error.response as any;
      return response.message || response.data?.message || 'Une erreur est survenue';
    }
  }
  
  return 'Une erreur inattendue est survenue';
}

/**
 * Handle API response with runtime validation
 */
export function handleApiResponse<T>(response: unknown): ApiResponse<T> {
  if (typeof response === 'object' && response !== null) {
    const res = response as any;
    return {
      success: res.success ?? false,
      data: res.data,
      message: res.message,
      errors: res.errors,
    };
  }
  
  throw new Error('Invalid API response format');
}

/**
 * Map HTTP status to user-friendly message
 */
export function getHttpErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Requête invalide',
    401: 'Authentification requise',
    403: 'Accès refusé',
    404: 'Ressource non trouvée',
    409: 'Conflit détecté',
    422: 'Données invalides',
    429: 'Trop de requêtes. Veuillez réessayer plus tard',
    500: 'Erreur serveur',
    502: 'Service indisponible',
    503: 'Maintenance en cours',
    504: 'Délai d\'attente dépassé',
  };
  
  return messages[status] || `Erreur ${status}`;
}

/**
 * Log error safely (avoid console in production)
 */
export function logError(error: unknown, context: string = ''): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
}
