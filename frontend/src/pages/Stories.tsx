import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, Lock, Sparkles, X } from 'lucide-react';
import FloatingElements from '../components/FloatingElements';
import { storyAPI } from '../utils/api';
import { StoryMetadata } from '../types/Story';

interface FilterState {
  ageGroup: string;
  occasions: string[];
  recipients: string[];
  values: string[];
}

const Stories: React.FC = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [filteredStories, setFilteredStories] = useState<string[]>([]);
  const [displayNoneStoryIds, setDisplayNoneStoryIds] = useState<Set<string>>(new Set());
  const [showNoResults, setShowNoResults] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    ageGroup: 'all',
    occasions: [],
    recipients: [],
    values: []
  });
  const [filters, setFilters] = useState<FilterState>({
    ageGroup: 'all',
    occasions: [],
    recipients: [],
    values: []
  });

  // Fetch stories from API
  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await storyAPI.getStoryMetadata();
        
        // Add the coming soon story to the fetched stories
        const storiesWithComingSoon = [
          ...response.data,
          {
            id: 'coming-soon',
            title: 'New Adventure',
            ageRange: { min: 0, max: 100 },
            values: [],
            occasions: [],
            recipients: [],
            alwaysShow: true,
            description: 'Coming Soon! This magical story will be available soon.',
            theme: 'Mystery & Wonder'
          }
        ];
        
        setStories(storiesWithComingSoon);
        setFilteredStories(storiesWithComingSoon.map(s => s.id));
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Failed to load stories. Please try again later.');
        // Fallback to hardcoded data if API fails
        const fallbackStories = [
          {
            id: 'animal-sound-parade',
            title: 'The Animal Sound Parade',
            ageRange: { min: 2, max: 4 },
            values: ['adventure', 'friendship', 'joy'],
            occasions: ['birthday', 'anytime'],
            recipients: ['son', 'daughter', 'grandchild'],
            description: "Your child's beloved Teddy goes missing. Join them in resolving the mystery by following a magical red ribbon trail, meeting helpful animals who respond with their unique sounds along the way.",
            theme: 'Adventure & Friendship'
          },
          {
            id: 'little-krishna',
            title: "Little Krishna's Butter Peekaboo",
            ageRange: { min: 3, max: 5 },
            values: ['culture', 'joy'],
            occasions: ['birthday', 'festival', 'anytime'],
            recipients: ['son', 'daughter', 'grandchild'],
            description: 'Experience the playful world of baby Krishna as your child joins in the fun and discovers the joy of sharing and laughter.',
            theme: 'Festival & Culture'
          },
          {
            id: 'diwali-magic',
            title: 'Diwali Magic',
            ageRange: { min: 3, max: 6 },
            values: ['joy', 'culture'],
            occasions: ['festival'],
            recipients: ['son', 'daughter', 'grandchild'],
            description: 'Celebrate the festival of lights as your child discovers the magic of Diwali traditions, family bonds, and the triumph of light over darkness.',
            theme: 'Festival & Joy'
          },
          {
            id: 'coming-soon',
            title: 'New Adventure',
            ageRange: { min: 0, max: 100 },
            values: [],
            occasions: [],
            recipients: [],
            alwaysShow: true,
            description: 'Coming Soon! This magical story will be available soon.',
            theme: 'Mystery & Wonder'
          }
        ];
        setStories(fallbackStories);
        setFilteredStories(fallbackStories.map(s => s.id));
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  // Filter stories based on current filter state
  const filterStories = (filterState: FilterState) => {
    let filtered = stories.filter(story => {
      // Always show "coming soon" card
      if (story.alwaysShow) return true;
      
      // Age filter
      if (filterState.ageGroup !== 'all') {
        const [minAge, maxAge] = filterState.ageGroup.split('-').map(Number);
        const isFullyContained = story.ageRange.min >= minAge && story.ageRange.max <= maxAge;
        if (!isFullyContained) return false;
      }
      
      // Occasions filter (OR logic within group)
      if (filterState.occasions.length > 0) {
        const matchesOccasion = filterState.occasions.some(occasion => 
          story.occasions.includes(occasion)
        );
        if (!matchesOccasion) return false;
      }
      
      // Recipients filter (OR logic within group)
      if (filterState.recipients.length > 0) {
        const matchesRecipient = filterState.recipients.some(recipient => 
          story.recipients.includes(recipient)
        );
        if (!matchesRecipient) return false;
      }
      
      // Values filter (OR logic within group)
      if (filterState.values.length > 0) {
        const matchesValue = filterState.values.some(value => 
          story.values.includes(value)
        );
        if (!matchesValue) return false;
      }
      
      return true;
    });
    
    return filtered.map(story => story.id);
  };

  // Update filtered stories when applied filters change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const newFilteredStories = filterStories(appliedFilters);
    
    // Identify stories that should become visible (remove from displayNone immediately)
    const currentlyHidden = Array.from(displayNoneStoryIds);
    const shouldBeVisible = currentlyHidden.filter(id => newFilteredStories.includes(id));
    
    if (shouldBeVisible.length > 0) {
      setDisplayNoneStoryIds(prev => {
        const newSet = new Set(prev);
        shouldBeVisible.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
    
    // Identify stories that should become hidden
    const currentlyVisible = filteredStories;
    const idsToHideDisplay = currentlyVisible.filter(id => !newFilteredStories.includes(id));
    
    setFilteredStories(newFilteredStories);
    setShowNoResults(newFilteredStories.length === 0);
    
    // Apply display: none after transition completes (400ms)
    if (idsToHideDisplay.length > 0) {
      timeoutId = setTimeout(() => {
        setDisplayNoneStoryIds(prev => {
          const newSet = new Set(prev);
          idsToHideDisplay.forEach(id => newSet.add(id));
          return newSet;
        });
      }, 400);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [appliedFilters]);

  // Initialize filtered stories on mount
  useEffect(() => {
    if (stories.length > 0) {
      setFilteredStories(stories.map(s => s.id));
    }
  }, [stories]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isMobileModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileModalOpen]);

  const handleMobileFilterClick = () => {
    setIsMobileModalOpen(true);
  };

  const closeMobileModal = () => {
    setIsMobileModalOpen(false);
  };

  const handleAgeGroupChange = (value: string) => {
    setFilters(prev => ({ ...prev, ageGroup: value }));
  };

  const handleCheckboxChange = (category: keyof FilterState, value: string) => {
    if (category === 'ageGroup') return; // Age group is handled separately
    
    setFilters(prev => ({
      ...prev,
      [category]: (prev[category] as string[]).includes(value)
        ? (prev[category] as string[]).filter(item => item !== value)
        : [...(prev[category] as string[]), value]
    }));
  };

  const clearAllFilters = () => {
    const defaultFilters = {
      ageGroup: 'all' as const,
      occasions: [],
      recipients: [],
      values: []
    };
    setFilters({
      ageGroup: 'all',
      occasions: [],
      recipients: [],
      values: []
    });
    setAppliedFilters(defaultFilters);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    
    // Close mobile modal if open
    if (isMobileModalOpen) {
      setIsMobileModalOpen(false);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.ageGroup !== 'all') count++;
    count += filters.occasions.length;
    count += filters.recipients.length;
    count += filters.values.length;
    return count;
  };

  const handleStorySelect = (storyId: string, storyTitle: string) => {
    // Navigate to story detail page for active stories
    if (storyId === 'coming-soon') {
      alert("Coming Soon! This magical story will be available soon.");
    } else {
      navigate(`/story/${storyId}`);
    }
  };

  const getVisibleStoriesCount = () => {
    return filteredStories.length;
  };

  // Loading state
  if (loading) {
    return (
      <div className="stories-page">
        <FloatingElements />
        <section className="stories-header">
          <div className="stories-header__container">
            <nav className="stories-breadcrumb">
              <Link to="/" className="stories-breadcrumb__link">Home</Link>
              <span className="stories-breadcrumb__separator">›</span>
              <span className="stories-breadcrumb__current">Stories</span>
            </nav>
            <div className="stories-header__content">
              <h1 className="stories-header__title">
                Choose Your <span className="stories-header__highlight">Magical Adventure</span>
              </h1>
              <p className="stories-header__subtitle">
                Loading magical stories...
              </p>
            </div>
          </div>
        </section>
        <main className="stories-main">
          <div className="stories-main__container">
            <div className="stories-content">
              <div className="stories-grid-area">
                <div className="stories-loading">
                  <div className="stories-loading__spinner">
                    <Sparkles className="animate-spin" size={48} />
                  </div>
                  <h3 className="stories-loading__title">Loading Stories...</h3>
                  <p className="stories-loading__text">Please wait while we fetch your magical adventures!</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error && stories.length === 0) {
    return (
      <div className="stories-page">
        <FloatingElements />
        <section className="stories-header">
          <div className="stories-header__container">
            <nav className="stories-breadcrumb">
              <Link to="/" className="stories-breadcrumb__link">Home</Link>
              <span className="stories-breadcrumb__separator">›</span>
              <span className="stories-breadcrumb__current">Stories</span>
            </nav>
            <div className="stories-header__content">
              <h1 className="stories-header__title">
                Choose Your <span className="stories-header__highlight">Magical Adventure</span>
              </h1>
              <p className="stories-header__subtitle">
                Something went wrong...
              </p>
            </div>
          </div>
        </section>
        <main className="stories-main">
          <div className="stories-main__container">
            <div className="stories-content">
              <div className="stories-grid-area">
                <div className="stories-error">
                  <div className="stories-error__icon">
                    <X size={48} />
                  </div>
                  <h3 className="stories-error__title">Oops! Something went wrong</h3>
                  <p className="stories-error__text">{error}</p>
                  <button 
                    className="stories-error__retry"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className="stories-page">
      <FloatingElements />
      
      {/* Header Section */}
      <section className="stories-header">
        <div className="stories-header__container">
          {/* Breadcrumb */}
          <nav className="stories-breadcrumb">
            <Link to="/" className="stories-breadcrumb__link">Home</Link>
            <span className="stories-breadcrumb__separator">›</span>
            <span className="stories-breadcrumb__current">Stories</span>
          </nav>

          <div className="stories-header__content">
            <h1 className="stories-header__title">
              Choose Your <span className="stories-header__highlight">Magical Adventure</span>
            </h1>
            <p className="stories-header__subtitle">
              Select a story and transform your child into the hero
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="stories-main">
        <div className="stories-main__container">
          {/* Mobile Filter Button */}
          <button 
            className="stories-filter-btn stories-filter-btn--mobile"
            onClick={handleMobileFilterClick}
          >
            <Filter className="stories-filter-btn__icon" />
            Filters
          </button>

          <div className="stories-content">
            {/* Sidebar - Desktop Only */}
            <aside className="stories-sidebar">
              <div className="stories-sidebar__content">
                <h3 className="stories-sidebar__title">
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <span className="stories-sidebar__badge">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </h3>
                
                {/* Age Group Filter */}
                <div className="filter-group">
                  <h4 className="filter-group__title">Age Group</h4>
                  <div className="filter-options">
                    {[
                      { value: 'all', label: 'All Ages' },
                      { value: '2-4', label: '2-4 years' },
                      { value: '3-5', label: '3-5 years' },
                      { value: '4-6', label: '4-6 years' }
                    ].map(option => (
                      <label key={option.value} className="filter-option filter-option--radio">
                        <input
                          type="radio"
                          name="ageGroup"
                          value={option.value}
                          checked={filters.ageGroup === option.value}
                          onChange={(e) => handleAgeGroupChange(e.target.value)}
                          className="filter-input"
                        />
                        <span className="filter-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Occasion Filter */}
                <div className="filter-group">
                  <h4 className="filter-group__title">Occasion</h4>
                  <div className="filter-options">
                    {[
                      { value: 'birthday', label: 'Birthday 🎂' },
                      { value: 'festival', label: 'Festival 🎊' },
                      { value: 'anytime', label: 'Any Time ✨' }
                    ].map(option => (
                      <label key={option.value} className="filter-option filter-option--checkbox">
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={filters.occasions.includes(option.value)}
                          onChange={() => handleCheckboxChange('occasions', option.value)}
                          className="filter-input"
                        />
                        <span className="filter-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recipient Filter */}
                <div className="filter-group">
                  <h4 className="filter-group__title">Recipient</h4>
                  <div className="filter-options">
                    {[
                      { value: 'son', label: 'Son 👦' },
                      { value: 'daughter', label: 'Daughter 👧' },
                      { value: 'grandchild', label: 'Grandchild 👶' }
                    ].map(option => (
                      <label key={option.value} className="filter-option filter-option--checkbox">
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={filters.recipients.includes(option.value)}
                          onChange={() => handleCheckboxChange('recipients', option.value)}
                          className="filter-input"
                        />
                        <span className="filter-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Values Filter */}
                <div className="filter-group">
                  <h4 className="filter-group__title">Values</h4>
                  <div className="filter-options">
                    {[
                      { value: 'friendship', label: 'Friendship 🤝' },
                      { value: 'adventure', label: 'Adventure 🚀' },
                      { value: 'culture', label: 'Culture 🛕' },
                      { value: 'joy', label: 'Joy 😊' }
                    ].map(option => (
                      <label key={option.value} className="filter-option filter-option--checkbox">
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={filters.values.includes(option.value)}
                          onChange={() => handleCheckboxChange('values', option.value)}
                          className="filter-input"
                        />
                        <span className="filter-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="filter-actions">
                  <button 
                    className="filter-apply-btn"
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </button>
                  <button 
                    className="filter-clear-btn"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="stories-grid-area">
              <div className="stories-grid-header">
                <p className="stories-results-count">Showing {getVisibleStoriesCount()} magical stories</p>
              </div>
              
              {showNoResults ? (
                <div className="stories-no-results">
                  <div className="stories-no-results__icon">
                    <Sparkles size={48} />
                  </div>
                  <h3 className="stories-no-results__title">No stories match your filters</h3>
                  <p className="stories-no-results__text">Try adjusting them to discover more magical adventures!</p>
                  <button 
                    className="stories-no-results__btn"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="stories-grid">
                {stories.map((story, index) => (
                  <div 
                    key={story.id}
                    className={`story-grid-card ${story.id === 'coming-soon' ? 'story-grid-card--coming-soon' : ''} ${filteredStories.includes(story.id) ? 'story-grid-card--visible' : 'story-grid-card--hidden'} ${displayNoneStoryIds.has(story.id) ? 'story-grid-card--display-none' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`story-grid-card__image-container ${story.id === 'diwali-magic' ? 'story-grid-card__image-container--gradient' : ''} ${story.id === 'coming-soon' ? 'story-grid-card__image-container--coming-soon' : ''}`}>
                      {story.id === 'coming-soon' ? (
                        <div className="story-grid-card__coming-soon-content">
                          <Lock className="story-grid-card__coming-soon-icon" size={32} />
                          <span className="story-grid-card__coming-soon-text">Coming Soon</span>
                          <Sparkles className="story-grid-card__sparkles" size={20} />
                        </div>
                      ) : story.id === 'diwali-magic' ? (
                        <>
                          <div className="story-grid-card__diya">🪔</div>
                          <div className="story-grid-card__diya">🪔</div>
                          <div className="story-grid-card__diya">🪔</div>
                          <div className="story-grid-card__shimmer"></div>
                        </>
                      ) : (
                        <>
                          <img 
                            src={story.imageUrl || getDefaultImage(story.id)} 
                            alt={story.title}
                            className="story-grid-card__image"
                          />
                          <div className="story-grid-card__shimmer"></div>
                        </>
                      )}
                    </div>
                    <div className="story-grid-card__content">
                      <h3 className="story-grid-card__title">{story.title}</h3>
                      <div className="story-grid-card__meta">
                        <span className="story-grid-card__age">
                          👶 {story.ageRange ? `${story.ageRange.min}-${story.ageRange.max} years` : 'All ages'}
                        </span>
                      </div>
                      <div className="story-grid-card__theme">
                        <span className="story-grid-card__theme-badge">{story.theme || 'Adventure'}</span>
                      </div>
                      <button 
                        className={`story-grid-card__select-btn ${story.id === 'coming-soon' ? 'story-grid-card__select-btn--disabled' : ''}`}
                        onClick={() => handleStorySelect(story.id, story.title)}
                        disabled={story.id === 'coming-soon'}
                      >
                        {story.id === 'coming-soon' ? 'Coming Soon' : 'Select Story'}
                        {story.id !== 'coming-soon' && <div className="btn-shimmer"></div>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filter Modal */}
      {isMobileModalOpen && (
        <div className="mobile-filter-modal">
          <div className="mobile-filter-modal__overlay" onClick={closeMobileModal}></div>
          <div className="mobile-filter-modal__content">
            {/* Modal Header */}
            <div className="mobile-filter-modal__header">
              <h3 className="mobile-filter-modal__title">
                Filters
                {getActiveFiltersCount() > 0 && (
                  <span className="mobile-filter-modal__badge">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </h3>
              <button 
                className="mobile-filter-modal__close"
                onClick={closeMobileModal}
                aria-label="Close filters"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="mobile-filter-modal__body">
              {/* Age Group Filter */}
              <div className="mobile-filter-group">
                <h4 className="mobile-filter-group__title">Age Group</h4>
                <div className="mobile-filter-options">
                  {[
                    { value: 'all', label: 'All Ages' },
                    { value: '2-4', label: '2-4 years' },
                    { value: '3-5', label: '3-5 years' },
                    { value: '4-6', label: '4-6 years' }
                  ].map(option => (
                    <label key={option.value} className="mobile-filter-option mobile-filter-option--radio">
                      <input
                        type="radio"
                        name="ageGroupMobile"
                        value={option.value}
                        checked={filters.ageGroup === option.value}
                        onChange={(e) => handleAgeGroupChange(e.target.value)}
                        className="mobile-filter-input"
                      />
                      <span className="mobile-filter-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Occasion Filter */}
              <div className="mobile-filter-group">
                <h4 className="mobile-filter-group__title">Occasion</h4>
                <div className="mobile-filter-options">
                  {[
                    { value: 'birthday', label: 'Birthday 🎂' },
                    { value: 'festival', label: 'Festival 🎊' },
                    { value: 'anytime', label: 'Any Time ✨' }
                  ].map(option => (
                    <label key={option.value} className="mobile-filter-option mobile-filter-option--checkbox">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={filters.occasions.includes(option.value)}
                        onChange={() => handleCheckboxChange('occasions', option.value)}
                        className="mobile-filter-input"
                      />
                      <span className="mobile-filter-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recipient Filter */}
              <div className="mobile-filter-group">
                <h4 className="mobile-filter-group__title">Recipient</h4>
                <div className="mobile-filter-options">
                  {[
                    { value: 'son', label: 'Son 👦' },
                    { value: 'daughter', label: 'Daughter 👧' },
                    { value: 'grandchild', label: 'Grandchild 👶' }
                  ].map(option => (
                    <label key={option.value} className="mobile-filter-option mobile-filter-option--checkbox">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={filters.recipients.includes(option.value)}
                        onChange={() => handleCheckboxChange('recipients', option.value)}
                        className="mobile-filter-input"
                      />
                      <span className="mobile-filter-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Values Filter */}
              <div className="mobile-filter-group">
                <h4 className="mobile-filter-group__title">Values</h4>
                <div className="mobile-filter-options">
                  {[
                    { value: 'friendship', label: 'Friendship 🤝' },
                    { value: 'adventure', label: 'Adventure 🚀' },
                    { value: 'culture', label: 'Culture 🛕' },
                    { value: 'joy', label: 'Joy 😊' }
                  ].map(option => (
                    <label key={option.value} className="mobile-filter-option mobile-filter-option--checkbox">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={filters.values.includes(option.value)}
                        onChange={() => handleCheckboxChange('values', option.value)}
                        className="mobile-filter-input"
                      />
                      <span className="mobile-filter-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="mobile-filter-modal__footer">
              <button 
                className="mobile-filter-clear-btn"
                onClick={clearAllFilters}
              >
                Clear All
              </button>
              <button 
                className="mobile-filter-apply-btn"
                onClick={applyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get default images for stories
const getDefaultImage = (storyId: string): string => {
  const imageMap: { [key: string]: string } = {
    'animal-sound-parade': '/page_01_scene.png',
    'little-krishna': '/page1.png',
    'diwali-magic': '', // This one uses gradient background
  };
  return imageMap[storyId] || '/placeholder-story.jpg';
};

export default Stories;