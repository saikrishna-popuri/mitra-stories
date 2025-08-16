import React, { useState, useEffect } from 'react';

interface FlipbookViewerProps {
  previewUrl: string;
  storyName: string;
  childName: string;
  onClose: () => void;
  onUpgrade: (requestType: 'preview' | 'personalize') => void;
}

export function FlipbookViewer({ previewUrl, storyName, childName, onClose, onUpgrade }: FlipbookViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreviewPages();
  }, [previewUrl]);

  async function fetchPreviewPages() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(previewUrl);
      const data = await response.json();
      
      if (data.status === 'processing') {
        // Poll for updates if still processing
        setTimeout(fetchPreviewPages, 2000);
      } else if (data.pages) {
        setPages(data.pages);
        setLoading(false);
      } else {
        setError(data.message || 'Failed to load preview pages.');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error or invalid preview URL.');
      setLoading(false);
      console.error('Error fetching preview pages:', err);
    }
  }

  return (
    <div className="flipbook-viewer">
      <div className="flipbook-header">
        <h2>{childName}'s {storyName}</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      {loading ? (
        <div className="loading-animation">
          <div className="magic-sparkles">✨</div>
          <p>Creating your magical story...</p>
        </div>
      ) : error ? (
        <div className="error-message-display">
          <p>{error}</p>
          <button onClick={onClose}>Close</button>
        </div>
      ) : (
        <div className="flipbook-container">
          <div className="page-display">
            {pages.length > 0 ? (
              <img src={pages[currentPage]} alt={`Page ${currentPage + 1}`} />
            ) : (
              <p>No pages to display.</p>
            )}
          </div>
          
          <div className="flipbook-controls">
            <button 
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            
            <span className="page-indicator">
              Page {currentPage + 1} of {pages.length}
            </span>
            
            <button 
              onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
              disabled={currentPage === pages.length - 1}
            >
              Next →
            </button>
          </div>
          
          <div className="preview-actions">
            <button className="upgrade-btn" onClick={() => onUpgrade('personalize')}>
              🎨 Get Full Story (₹599)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}