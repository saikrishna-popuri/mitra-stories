// Type definitions for API responses
export interface StoryMetadata {
  id: string;
  title: string;
  ageRange: { min: number; max: number };
  values: string[];
  occasions: string[];
  recipients: string[];
  alwaysShow?: boolean;
  description?: string;
  theme?: string;
  imageUrl?: string;
}

export interface StoryPage {
  id: number;
  color: string;
  title: string;
  content?: string;
  imageUrl?: string;
}

export interface StoryData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  ageRange: string;
  pageCount: number;
  theme: string;
  pages: StoryPage[];
  imageUrl?: string;
  metadata?: {
    values: string[];
    occasions: string[];
    recipients: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}