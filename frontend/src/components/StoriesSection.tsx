import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { storyAPI } from '../utils/api';
import { StoryMetadata } from '../types/Story';

const StoriesSection: React.FC = () => {
  console.log('StoriesSection component rendering...');
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false]);
  const [stories, setStories] = useState<StoryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    console.log('StoriesSection useEffect triggered.');
    // Fetch stories from API
    const fetchStories = async () => {
      console.log('Fetching stories...');
      try {
        setLoading(true);
        setError(null);
        const response = await storyAPI.getStoryMetadata();
        console.log('API response received:', response);
        // Filter to show only the first 3 stories for the homepage
        if (response.data && response.data.length > 0) {
          const featuredStories = response.data.slice(0, 3);
          setStories(featuredStories);
          console.log('Stories set:', featuredStories);
        } else {
          console.warn('API returned no data, using fallback from StoriesSection catch block.');
          // Fallback to hardcoded data if API returns empty or null data
          const fallbackStories = [
            {
              id: 'animal-sound-parade',
              title: 'The Animal Sound Parade',
              ageRange: { min: 2, max: 5 },
              values: ['friendship', 'perseverance'],
              occasions: ['birthday', 'anytime'],
              recipients: ['son', 'daughter'],
              description: 'Aarav solves a mystery with animal friends!',
              theme: 'Adventure & Friendship',
              imageUrl: '/page_01_scene.png'
            },
            {
              id: 'little-krishna',
              title: "Little Krishna's Butter Peekaboo",
              ageRange: { min: 1, max: 4 },
              values: ['playfulness', 'culture'],
              occasions: ['festival', 'anytime'],
              recipients: ['son', 'daughter'],
              description: 'A playful adventure with baby Krishna!',
              theme: 'Cultural & Playful',
              imageUrl: '/page1.png'
            },
            {
              id: 'diwali-magic',
              title: 'Diwali Magic',
              ageRange: { min: 3, max: 6 },
              values: ['celebration', 'tradition'],
              occasions: ['festival'],
              recipients: ['son', 'daughter'],
              description: 'A festival of lights adventure!',
              theme: 'Festival & Joy',
              alwaysShow: false
            }
          ];
          setStories(fallbackStories);
        }
      } catch (error) {
        console.error('Error fetching stories in StoriesSection:', error);
        // Fallback to hardcoded data
        const fallbackStories = [
          {
            id: 'animal-sound-parade',
            title: 'The Animal Sound Parade',
            ageRange: { min: 2, max: 5 },
            values: ['friendship', 'perseverance'],
            occasions: ['birthday', 'anytime'],
            recipients: ['son', 'daughter'],
            description: 'Aarav solves a mystery with animal friends!',
            theme: 'Adventure & Friendship',
            imageUrl: '/page_01_scene.png'
          },
          {
            id: 'little-krishna',
            title: "Little Krishna's Butter Peekaboo",
            ageRange: { min: 1, max: 4 },
            values: ['playfulness', 'culture'],
            occasions: ['festival', 'anytime'],
            recipients: ['son', 'daughter'],
            description: 'A playful adventure with baby Krishna!',
            theme: 'Cultural & Playful',
            imageUrl: '/page1.png'
          },
          {
            id: 'diwali-magic',
            title: 'Diwali Magic',
            ageRange: { min: 3, max: 6 },
            values: ['celebration', 'tradition'],
            occasions: ['festival'],
            recipients: ['son', 'daughter'],
            description: 'A festival of lights adventure!',
            theme: 'Festival & Joy',
            alwaysShow: false
          }
        ];
        setStories(fallbackStories);
        console.log('Stories set from catch fallback:', fallbackStories);
      } finally {
        setLoading(false);
        console.log('Loading set to false. Current stories length:', stories.length);
      }
    };

    fetchStories();
  }, []);

  useEffect(() => {
    // Intersection Observer for animations
    const observers = cardsRef.current.map((card, index) => {
      if (!card) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleCards(prev => {
                const newVisible = [...prev];
                newVisible[index] = true;
                return newVisible;
              });
            }
          });
        },
        { threshold: 0.2 }
      );

      observer.observe(card);
      return observer;
    });

    return () => {
      observers.forEach(observer => observer?.disconnect());
    };
  }, [stories]);

  const handleStoryClick = (storyId: string, title: string) => {
    console.log(`Navigate to story: ${title} (${storyId})`);
  };

  if (loading) {
    console.log('StoriesSection: Rendering loading state.');
    return (
      <section className="stories-section">
        <div className="stories-section__container">
          <h2 className="stories-section__heading">
            ✨ Our Bestsellers ✨
          </h2>
          <div className="stories-section__loading">
            <p>Loading magical stories...</p>
          </div>
        </div>
      </section>
    );
  }

  console.log('StoriesSection: Rendering main content. Stories count:', stories.length);
  return (
    <section className="stories-section">
      <div className="stories-section__container">
        <h2 className="stories-section__heading">
          ✨ Our Bestsellers ✨
        </h2>
        
        <div className="stories-section__grid">
          {stories.slice(0, 3).map((story, index) => (
            <div 
              key={story.id}
              ref={el => cardsRef.current[index] = el}
              className={`story-card ${visibleCards[index] ? 'story-card--visible' : ''}`}
              onClick={() => handleStoryClick(story.id, story.title)}
            >
              {index === 0 && (
                <div className="story-card__badge story-card__badge--popular">
                  MOST POPULAR
                </div>
              )}
              {index === 1 && (
                <div className="story-card__badge story-card__badge--new">
                  NEW!
                </div>
              )}
              
              {story.id === 'diwali-magic' ? (
                <div className="story-card__cover story-card__cover--gradient">
                  <div className="story-card__diya">🪔</div>
                  <div className="story-card__diya">🪔</div>
                  <div className="story-card__diya">🪔</div>
                  <div className="story-card__overlay">
                    <span className="story-card__coming-soon">COMING SOON</span>
                  </div>
                </div>
              ) : (
                <div className="story-card__cover">
                  <img 
                    src={story.imageUrl || getDefaultImage(story.id)} 
                    alt={story.title}
                    className="story-card__image"
                  />
                </div>
              )}
              
              <div className="story-card__content">
                <div className="story-card__header">
                  <h3 className="story-card__title">{story.title}</h3>
                  <div className="story-card__age">
                    {story.ageRange ? `${story.ageRange.min}-${story.ageRange.max} years` : 'All ages'}
                  </div>
                </div>
                <p className="story-card__description">
                  {story.description}
                </p>
                <div className="story-card__tags">
                  {story.values.slice(0, 2).map((value, valueIndex) => (
                    <span key={valueIndex} className={`story-card__tag story-card__tag--${value}`}>
                      {getValueEmoji(value)} {formatValue(value)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="story-card__preview-btn">
                Preview Story →
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Helper functions
const getDefaultImage = (storyId: string): string => {
  const imageMap: { [key: string]: string } = {
    'animal-sound-parade': '/page_01_scene.png',
    'little-krishna': '/page1.png',
    'diwali-magic': '', // This one uses gradient background
  };
  return imageMap[storyId] || '/placeholder-story.jpg';
};

const getValueEmoji = (value: string): string => {
  const emojiMap: { [key: string]: string } = {
    friendship: '🌟',
    perseverance: '💪',
    playfulness: '🎮',
    culture: '🕉️',
    celebration: '🎆',
    tradition: '🏮',
    adventure: '🚀',
    joy: '😊',
  };
  return emojiMap[value] || '✨';
};

const formatValue = (value: string): string => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default StoriesSection;