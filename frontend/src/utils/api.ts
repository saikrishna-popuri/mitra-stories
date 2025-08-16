import { ApiResponse, StoryData, StoryMetadata } from '../types/Story';

const API_URL = 'https://mitra-stories-production.up.railway.app';

// Personalization request interface
export interface PersonalizationRequestData {
  request_type: 'preview' | 'personalize';
  name: string;
  gender: string;
  photo: File;
  story_name: string;
  style: string;
  email: string;
}

// Local fallback data
const LOCAL_STORY_METADATA: StoryMetadata[] = [
  {
    id: 'animal-sound-parade',
    title: 'The Animal Sound Parade',
    ageRange: { min: 2, max: 4 },
    values: ['adventure', 'friendship', 'joy'],
    occasions: ['birthday', 'anytime'],
    recipients: ['son', 'daughter', 'grandchild']
  },
  {
    id: 'little-krishna',
    title: "Little Krishna's Butter Peekaboo",
    ageRange: { min: 3, max: 5 },
    values: ['culture', 'joy'],
    occasions: ['birthday', 'festival', 'anytime'],
    recipients: ['son', 'daughter', 'grandchild']
  },
  {
    id: 'diwali-magic',
    title: 'Diwali Magic',
    ageRange: { min: 3, max: 6 },
    values: ['joy', 'culture'],
    occasions: ['festival'],
    recipients: ['son', 'daughter', 'grandchild']
  },
  {
    id: 'coming-soon',
    title: 'New Adventure',
    ageRange: { min: 0, max: 100 },
    values: [],
    occasions: [],
    recipients: [],
    alwaysShow: true
  }
];

// Mock story data for fallback
const MOCK_STORY_DATA = {
  'animal-sound-parade': {
    id: 'animal-sound-parade',
    title: 'The Animal Sound Parade',
    pages: [
      {
        id: 'page-1',
        content: 'Once upon a time, there was a magical parade of animals...',
        imageUrl: '/page_01_scene.png'
      }
    ]
  },
  'little-krishna': {
    id: 'little-krishna',
    title: "Little Krishna's Butter Peekaboo",
    pages: [
      {
        id: 'page-1',
        content: 'Little Krishna loved playing peekaboo...',
        imageUrl: '/page1.png'
      }
    ]
  },
  'diwali-magic': {
    id: 'diwali-magic',
    title: 'Diwali Magic',
    pages: [
      {
        id: 'page-1',
        content: 'The festival of lights brought magic to every home...',
        imageUrl: '/diwali-scene.png'
      }
    ]
  }
};

// API functions
export const storyAPI = {
  async getStoryMetadata(): Promise<ApiResponse<StoryMetadata[]>> {
    try {
      const response = await fetch(`${API_URL}/api/stories/metadata`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Stories fetched successfully'
      };
    } catch (error) {
      console.warn('Failed to fetch from API, using local data:', error);
      return {
        success: false,
        data: LOCAL_STORY_METADATA,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async getStoryById(storyId: string): Promise<ApiResponse<StoryData>> {
    try {
      const response = await fetch(`${API_URL}/api/stories/${storyId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Story fetched successfully'
      };
    } catch (error) {
      console.warn('Failed to fetch story from API, using mock data:', error);
      const fallbackData = MOCK_STORY_DATA[storyId as keyof typeof MOCK_STORY_DATA];
      return {
        success: false,
        data: fallbackData,
        error: fallbackData ? 'Using fallback data due to API error' : 'Story not found'
      };
    }
  },

  async getStoriesWithFilters(filters?: any): Promise<ApiResponse<StoryMetadata[]>> {
    try {
      const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
      const response = await fetch(`${API_URL}/api/stories${queryString}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        success: true,
        data: data,
        message: 'Filtered stories fetched successfully'
      };
    } catch (error) {
      console.warn('Failed to fetch filtered stories from API, using local data:', error);
      return {
        success: false,
        data: LOCAL_STORY_METADATA,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async sendPersonalizationRequest(requestData: PersonalizationRequestData): Promise<ApiResponse<any>> {
    const formData = new FormData();
    
    formData.append('request_type', requestData.request_type);
    formData.append('name', requestData.name);
    formData.append('gender', requestData.gender);
    formData.append('photo', requestData.photo);
    formData.append('story_name', requestData.story_name);
    formData.append('style', requestData.style);
    formData.append('email', requestData.email);
    
    try {
      const response = await fetch(`${API_URL}/api/personalize`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return { 
        success: true, 
        data: data, 
        message: 'Personalization request sent successfully' 
      };
    } catch (error) {
      console.error('Personalization request failed:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};