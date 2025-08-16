import React from 'react';

const FloatingElements: React.FC = () => {
  return (
    <div className="floating-elements">
      {/* Stars */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={`star-${i}`} 
          className={`floating-star floating-star--${i + 1}`}
        >
          ✦
        </div>
      ))}
      
      {/* Hearts */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div 
          key={`heart-${i}`} 
          className={`floating-heart floating-heart--${i + 1}`}
        >
          💖
        </div>
      ))}
      
      {/* Clouds */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div 
          key={`cloud-${i}`} 
          className={`floating-cloud floating-cloud--${i + 1}`}
        >
          ☁
        </div>
      ))}
    </div>
  );
};

export default FloatingElements;