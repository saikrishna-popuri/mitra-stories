import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import FloatingElements from '../components/FloatingElements';
import { storyAPI, PersonalizationRequestData } from '../utils/api';
import { StoryData } from '../types/Story';
import { FlipbookViewer } from '../components/FlipbookViewer';
import * as faceapi from 'face-api.js';

const StoryDetail: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // New state for the multi-step form
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PersonalizationRequestData>({
    request_type: 'preview',
    name: '',
    gender: 'boy',
    email: '',
    style: 'Cartoon Magic',
    photo: null as unknown as File,
    story_name: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Face detection related states and refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const faceDetectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const [faceDetectionReady, setFaceDetectionReady] = useState(false);
  const [croppedPhotoBase64, setCroppedPhotoBase64] = useState<string | null>(null);
  const [isDetectingFace, setIsDetectingFace] = useState(false);

  // Fetch story data from API
  useEffect(() => {
    const fetchStory = async () => {
      if (!storyId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await storyAPI.getStoryById(storyId);
        setStoryData(response.data);
      } catch (err) {
        console.error('Error fetching story:', err);
        setError('Failed to load story details. Please try again later.');
        
        // Fallback to hardcoded data if API fails
        const fallbackData = getFallbackStoryData(storyId);
        if (fallbackData) {
          setStoryData(fallbackData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId]);

  // Initialize face detection
  useEffect(() => {
    async function initializeFaceDetection() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setFaceDetectionReady(true);
        console.log('Face detection models loaded.');
      } catch (err) {
        setFaceDetectionReady(false);
        console.warn('Face detection disabled - models not found. Photo upload will work without face cropping.');
      }
    }
    initializeFaceDetection();
  }, []);

  async function detectAndCropFace(imageFile: File): Promise<string> {
    setIsDetectingFace(true);
    setFormErrors(prev => ({ ...prev, photo: '' }));
    try {
      const img = await faceapi.bufferToImage(imageFile);
      const detections = await faceapi.detectAllFaces(img, 
        new faceapi.TinyFaceDetectorOptions()
      );
      
      if (detections.length === 0) {
        throw new Error('No face detected. Please upload a clear front-facing photo.');
      }
      
      // Crop face with padding
      const box = detections[0].box;
      const padding = 1.5;
      const cropSize = Math.max(box.width, box.height) * padding;
      
      const canvas = faceDetectionCanvasRef.current;
      if (!canvas) throw new Error('Canvas not found for cropping.');
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context.');

      canvas.width = cropSize;
      canvas.height = cropSize;

      // Calculate source coordinates to center the cropped face
      const sourceX = box.x - (cropSize - box.width) / 2;
      const sourceY = box.y - (cropSize - box.height) / 2;

      ctx.drawImage(img, sourceX, sourceY, cropSize, cropSize, 0, 0, cropSize, cropSize);
      
      return canvas.toDataURL('image/png');
    } catch (error: any) {
      setFormErrors(prev => ({ ...prev, photo: error.message || 'Error processing photo.' }));
      throw error;
    } finally {
      setIsDetectingFace(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleGenderChange = (gender: 'boy' | 'girl') => {
    setFormData(prev => ({ ...prev, gender }));
    setFormErrors(prev => ({ ...prev, gender: '' }));
  };

  const handleStyleChange = (style: 'Cartoon Magic' | 'Heritage') => {
    setFormData(prev => ({ ...prev, style }));
    setFormErrors(prev => ({ ...prev, style: '' }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!faceDetectionReady) {
        // Skip face detection if models not available
        setFormData(prev => ({ ...prev, photo: file }));
        setFormErrors(prev => ({ ...prev, photo: '' }));
        return;
      }
      try {
        const croppedBase64 = await detectAndCropFace(file);
        setCroppedPhotoBase64(croppedBase64);
        setFormData(prev => ({ ...prev, photo: file }));
        setFormErrors(prev => ({ ...prev, photo: '' }));
      } catch (err) {
        // Error already set by detectAndCropFace
        setCroppedPhotoBase64(null);
        setFormData(prev => ({ ...prev, photo: null as unknown as File }));
      }
    }
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Child\'s name is required.';
    if (!formData.gender) errors.gender = 'Gender is required.';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Valid email is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!formData.style) errors.style = 'Please select a style.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    if (!formData.photo) errors.photo = 'Please upload a photo.';
    if (formErrors.photo) errors.photo = formErrors.photo;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }
    
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmitPersonalization = async (requestType: 'preview' | 'personalize') => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      setCurrentStep(1);
      return;
    }

    if (!storyData) {
      setError('Story data not available.');
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});
    setSubmitSuccess(false);

    try {
      const dataToSend: PersonalizationRequestData = {
        ...formData,
        request_type: requestType,
        story_name: storyData.id,
      };

      const response = await storyAPI.sendPersonalizationRequest(dataToSend);

      if (response.success && response.data?.preview_url) {
        setPreviewUrl(response.data.preview_url);
        setSubmitSuccess(true);
      } else {
        setFormErrors({ general: response.error || 'Failed to personalize story.' });
      }
    } catch (err: any) {
      setFormErrors({ general: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if story not found
  if (!loading && !storyData) {
    return <Navigate to="/stories" replace />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="story-detail-page">
        <FloatingElements />
        <section className="story-detail-header">
          <div className="story-detail-header__container">
            <nav className="story-detail-breadcrumb">
              <Link to="/" className="story-detail-breadcrumb__link">Home</Link>
              <span className="story-detail-breadcrumb__separator">›</span>
              <Link to="/stories" className="story-detail-breadcrumb__link">Stories</Link>
              <span className="story-detail-breadcrumb__separator">›</span>
              <span className="story-detail-breadcrumb__current">Loading...</span>
            </nav>
            <div className="story-detail-header__content">
              <h1 className="story-detail-header__title">
                Loading Story...
              </h1>
            </div>
          </div>
        </section>
        <main className="story-detail-main">
          <div className="story-detail-main__container">
            <div className="story-detail-loading">
              <div className="story-detail-loading__spinner">
                <Sparkles className="animate-spin" size={48} />
              </div>
              <h3 className="story-detail-loading__title">Loading Story Details...</h3>
              <p className="story-detail-loading__text">Please wait while we prepare your magical adventure!</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !storyData) {
    return (
      <div className="story-detail-page">
        <FloatingElements />
        <section className="story-detail-header">
          <div className="story-detail-header__container">
            <nav className="story-detail-breadcrumb">
              <Link to="/" className="story-detail-breadcrumb__link">Home</Link>
              <span className="story-detail-breadcrumb__separator">›</span>
              <Link to="/stories" className="story-detail-breadcrumb__link">Stories</Link>
              <span className="story-detail-breadcrumb__separator">›</span>
              <span className="story-detail-breadcrumb__current">Error</span>
            </nav>
            <div className="story-detail-header__content">
              <h1 className="story-detail-header__title">
                Oops! Something went wrong
              </h1>
            </div>
          </div>
        </section>
        <main className="story-detail-main">
          <div className="story-detail-main__container">
            <div className="story-detail-error">
              <div className="story-detail-error__icon">
                <X size={48} />
              </div>
              <h3 className="story-detail-error__title">Failed to load story</h3>
              <p className="story-detail-error__text">{error}</p>
              <div className="story-detail-error__actions">
                <button 
                  className="story-detail-error__retry"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </button>
                <Link to="/stories" className="story-detail-error__back">
                  Back to Stories
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Ensure storyData exists before rendering
  if (!storyData) {
    return <Navigate to="/stories" replace />;
  }

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % storyData.pages.length);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + storyData.pages.length) % storyData.pages.length);
  };

  const goToPage = (index: number) => {
    setCurrentPage(index);
  };

  return (
    <div className="story-detail-page">
      <FloatingElements />
      
      {/* Header Section */}
      <section className="story-detail-header">
        <div className="story-detail-header__container">
          {/* Breadcrumb */}
          <nav className="story-detail-breadcrumb">
            <Link to="/" className="story-detail-breadcrumb__link">Home</Link>
            <span className="story-detail-breadcrumb__separator">›</span>
            <Link to="/stories" className="story-detail-breadcrumb__link">Stories</Link>
            <span className="story-detail-breadcrumb__separator">›</span>
            <span className="story-detail-breadcrumb__current">{storyData.title}</span>
          </nav>

          <div className="story-detail-header__content">
            <h1 className="story-detail-header__title">
              {storyData.title}
              {storyData.subtitle && <span className="story-detail-header__subtitle">{storyData.subtitle}</span>}
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="story-detail-main">
        <div className="story-detail-main__container">
          <div className="story-detail-content">
            {/* Left Side - Story Preview Carousel */}
            <div className="story-detail-preview">
              <div className="story-carousel">
                <div className="story-carousel__container">
                  {/* Navigation Arrows */}
                  <button 
                    className="story-carousel__nav story-carousel__nav--prev"
                    onClick={prevPage}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    className="story-carousel__nav story-carousel__nav--next"
                    onClick={nextPage}
                    aria-label="Next page"
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Book Frame */}
                  <div className="story-carousel__book">
                    <div className="story-carousel__page-container">
                      <div 
                        className="story-carousel__page"
                        style={{ backgroundColor: storyData.pages[currentPage].color }}
                      >
                        <span className="story-carousel__page-title">
                          {storyData.pages[currentPage].title}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dot Indicators */}
                  <div className="story-carousel__dots">
                    {storyData.pages.map((_, index) => (
                      <button
                        key={index}
                        className={`story-carousel__dot ${index === currentPage ? 'story-carousel__dot--active' : ''}`}
                        onClick={() => goToPage(index)}
                        aria-label={`Go to page ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Story Info Panel */}
            <div className="story-detail-info">
              <div className="story-detail-info__content">
                {/* Story Description */}
                <div className="story-detail-info__description">
                  <p>{storyData.description}</p>
                </div>

                {/* Metadata Badges */}
                <div className="story-detail-info__metadata">
                  <span className="story-detail-badge story-detail-badge--age">
                    👶 {storyData.ageRange}
                  </span>
                  <span className="story-detail-badge story-detail-badge--pages">
                    📖 {storyData.pageCount} pages
                  </span>
                  <span className="story-detail-badge story-detail-badge--theme">
                    ✨ {storyData.theme}
                  </span>
                </div>

                {/* Personalization Section */}
                {previewUrl ? (
                  <FlipbookViewer
                    previewUrl={previewUrl}
                    storyName={storyData.title}
                    childName={formData.name}
                    onClose={() => setPreviewUrl(null)}
                    onUpgrade={handleSubmitPersonalization}
                  />
                ) : (
                  <div className="personalization-form-container">
                    <h3 className="story-detail-personalization__title">Create Your Personalized Story</h3>
                    
                    {currentStep === 1 && (
                      <div className="form-step">
                        <h3>Tell us about your little star ✨</h3>
                        
                        <div className="form-group">
                          <label htmlFor="childName">Child's Name</label>
                          <input 
                            id="childName"
                            type="text" 
                            name="name"
                            placeholder="Child's Name" 
                            value={formData.name}
                            onChange={handleInputChange}
                            required 
                            className="form-input"
                          />
                          {formErrors.name && <p className="error-message">{formErrors.name}</p>}
                        </div>
                        
                        <div className="form-group">
                          <label>Gender</label>
                          <div className="gender-selector">
                            <label>
                              <input 
                                type="radio" 
                                name="gender" 
                                value="boy" 
                                checked={formData.gender === 'boy'}
                                onChange={() => handleGenderChange('boy')}
                              />
                              <span>👦 Boy</span>
                            </label>
                            <label>
                              <input 
                                type="radio" 
                                name="gender" 
                                value="girl" 
                                checked={formData.gender === 'girl'}
                                onChange={() => handleGenderChange('girl')}
                              />
                              <span>👧 Girl</span>
                            </label>
                          </div>
                          {formErrors.gender && <p className="error-message">{formErrors.gender}</p>}
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="parentEmail">Parent's Email</label>
                          <input 
                            id="parentEmail"
                            type="email" 
                            name="email"
                            placeholder="Parent's Email" 
                            value={formData.email}
                            onChange={handleInputChange}
                            required 
                            className="form-input"
                          />
                          {formErrors.email && <p className="error-message">{formErrors.email}</p>}
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="form-step">
                        <h3>Choose your magic style 🎨</h3>
                        <div className="style-selection">
                          <div className="style-options">
                            <div 
                              className={`style-card ${formData.style === 'Cartoon Magic' ? 'active' : ''}`} 
                              onClick={() => handleStyleChange('Cartoon Magic')}
                              data-style="Cartoon Magic"
                            >
                              <img src="/cartoon-magic-pose-1.png" alt="Cartoon Style" />
                              <h4>Cartoon Magic</h4>
                              <p>Vibrant, playful cartoon style</p>
                            </div>
                            <div 
                              className={`style-card ${formData.style === 'Heritage' ? 'active' : ''}`} 
                              onClick={() => handleStyleChange('Heritage')}
                              data-style="Heritage"
                            >
                              <img src="/heritage-pose-1.png" alt="Heritage Style" />
                              <h4>Heritage</h4>
                              <p>Traditional Indian art style</p>
                              <span className="coming-soon">Coming Soon</span>
                            </div>
                          </div>
                          {formErrors.style && <p className="error-message">{formErrors.style}</p>}
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="form-step">
                        <h3>Upload a clear front-facing photo 📸</h3>
                        <div className="upload-area">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                            ref={photoInputRef}
                            style={{ display: 'none' }}
                          />
                          <button 
                            className="upload-photo-btn" 
                            onClick={() => photoInputRef.current?.click()}
                            disabled={isDetectingFace || !faceDetectionReady}
                          >
                            {isDetectingFace ? 'Processing...' : (faceDetectionReady ? 'Choose Photo' : 'Loading AI...')}
                          </button>
                          <canvas ref={faceDetectionCanvasRef} style={{display: 'none'}} />
                          
                          {croppedPhotoBase64 && (
                            <div className="uploaded-photo-preview">
                              <img src={croppedPhotoBase64} alt="Cropped Face Preview" />
                              <p>Photo uploaded successfully!</p>
                            </div>
                          )}
                          {formErrors.photo && <p className="error-message">{formErrors.photo}</p>}
                        </div>
                      </div>
                    )}

                    <div className="form-navigation">
                      {currentStep > 1 && (
                        <button className="btn btn--secondary" onClick={handlePrevStep} disabled={isSubmitting}>
                          ← Previous
                        </button>
                      )}
                      {currentStep < 3 && (
                        <button className="btn btn--primary" onClick={handleNextStep} disabled={isSubmitting}>
                          Next →
                        </button>
                      )}
                      {currentStep === 3 && (
                        <button 
                          className="btn btn--primary" 
                          onClick={() => handleSubmitPersonalization('preview')} 
                          disabled={isSubmitting || isDetectingFace || !formData.photo}
                        >
                          {isSubmitting ? 'Generating Preview...' : 'Generate Preview'}
                        </button>
                      )}
                    </div>
                    {formErrors.general && <p className="error-message">{formErrors.general}</p>}
                    {isSubmitting && (
                      <div className="loading-animation-form">
                        <Sparkles className="animate-spin" size={32} />
                        <p>Please wait, generating your story...</p>
                      </div>
                    )}
                    {submitSuccess && (
                      <div className="success-message-form">
                        <Sparkles size={32} />
                        <p>Story preview generated successfully!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Fallback function to provide hardcoded data if API fails
const getFallbackStoryData = (storyId: string): StoryData | null => {
  const fallbackData: Record<string, StoryData> = {
    'animal-sound-parade': {
      id: 'animal-sound-parade',
      title: 'The Animal Sound Parade',
      subtitle: 'Finding Teddy',
      description: 'Your child\'s beloved Teddy goes missing. Join them in resolving the mystery by following a magical red ribbon trail, meeting helpful animals who respond with their unique sounds along the way.',
      ageRange: '2-4 years',
      pageCount: 21,
      theme: 'Adventure & Friendship',
      pages: [
        { id: 1, color: '#87CEEB', title: 'Page 1' },
        { id: 2, color: '#98D8E8', title: 'Page 2' },
        { id: 3, color: '#A9E2F3', title: 'Page 3' },
        { id: 4, color: '#BAE6FF', title: 'Page 4' },
        { id: 5, color: '#CBE7FF', title: 'Page 5' }
      ]
    },
    'little-krishna': {
      id: 'little-krishna',
      title: "Little Krishna's Butter Peekaboo",
      subtitle: '',
      description: 'Experience the playful world of baby Krishna as your child joins in the fun and discovers the joy of sharing and laughter.',
      ageRange: '3-5 years',
      pageCount: 20,
      theme: 'Festival & Culture',
      pages: [
        { id: 1, color: '#DDA0DD', title: 'Page 1' },
        { id: 2, color: '#E6B8E6', title: 'Page 2' },
        { id: 3, color: '#EFC9EF', title: 'Page 3' },
        { id: 4, color: '#F8DAF8', title: 'Page 4' },
        { id: 5, color: '#FFEBFF', title: 'Page 5' }
      ]
    },
    'diwali-magic': {
      id: 'diwali-magic',
      title: 'Diwali Magic',
      subtitle: '',
      description: 'Celebrate the festival of lights as your child discovers the magic of Diwali traditions, family bonds, and the triumph of light over darkness.',
      ageRange: '3-6 years',
      pageCount: 20,
      theme: 'Festival & Joy',
      pages: [
        { id: 1, color: '#FFA500', title: 'Page 1' },
        { id: 2, color: '#FFB347', title: 'Page 2' },
        { id: 3, color: '#FFC966', title: 'Page 3' },
        { id: 4, color: '#FFD700', title: 'Page 4' },
        { id: 5, color: '#FFE55C', title: 'Page 5' }
      ]
    }
  };
  
  return fallbackData[storyId] || null;
};

export default StoryDetail;