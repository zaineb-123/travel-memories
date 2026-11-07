export interface Memory {
  id: number;
  user_id: number;
  title: string;
  description: string;
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  travel_date: string;
  cover_image: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  visibility: 'public' | 'private' | 'followers';
  status: 'published' | 'draft' | 'archived';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  
  user?: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
  photos?: MemoryPhoto[];
  tags?: Tag[];
  is_liked?: boolean;
  is_favorited?: boolean;
  /** Premier souvenir public de l'auteur dans ce pays : le pays s'est colorié avec lui. */
  first_in_country?: boolean;
}

export interface MemoryInput {
  title: string;
  description: string;
  country: string;
  city?: string;
  travel_date: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  visibility?: 'public' | 'private' | 'followers';
}

export interface MemoryPhoto {
  id: number;
  memory_id: number;
  image_url: string;
  caption?: string;
  sort_order: number;
  is_cover: boolean;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
}

export interface Comment {
  id: number;
  user_id: number;
  memory_id: number;
  parent_id?: number;
  content: string;
  likes_count: number;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string;
  };
  replies?: Comment[];
}