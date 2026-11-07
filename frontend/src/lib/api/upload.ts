import { apiClient } from './client';

/**
 * Envois de fichiers. Tout passe par apiClient, qui ajoute le jeton depuis
 * `auth-storage` (l'ancienne version lisait une clé "token" inexistante :
 * les envois partaient sans authentification).
 */
export const uploadApi = {
  uploadAvatar: (file: File): Promise<{ success: boolean; data: { avatar_url: string } }> =>
    apiClient.upload('/users/avatar', file, 'avatar'),

  uploadMemoryPhoto: (memoryId: number, file: File): Promise<{ success: boolean; data: { image_url: string } }> =>
    apiClient.upload(`/memories/${memoryId}/photos`, file, 'photo'),

  uploadMultiplePhotos: (
    memoryId: number,
    files: File[],
    onProgress?: (p: number) => void,
  ): Promise<{ success: boolean; data: { images_urls: string[] } }> =>
    apiClient.uploadMultiple(`/memories/${memoryId}/photos/multiple`, files, 'photos[]', onProgress),
};
