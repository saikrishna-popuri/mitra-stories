import React, { useState, useEffect } from 'react';

interface AnimatedTitleProps {
  onPhraseChange: (phrase: 'every' | 'your') => void;
  onTransitionChange: (isTransitioning: boolean) => void;
}

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ onPhraseChange, onTransitionChange }) => {
  const [currentPhrase, setCurrentPhrase] = useState<'every' | 'your'>('every');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      onTransitionChange(true);
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentPhrase(prevPhrase => {
          const newPhrase = prevPhrase === 'every' ? 'your' : 'every';
          onPhraseChange(newPhrase);
          return newPhrase;
        });
        setIsTransitioning(false);
        onTransitionChange(false);
      }, 750); // Trigger timing
    }, 6000); // Extended to 6 seconds for more meditative effect

    return () => clearInterval(interval);
  }, [onPhraseChange, onTransitionChange]);

  const triggerSparkles = () => {
    if (isTransitioning) {
      // Create sparkle elements
      const sparkleContainer = document.querySelector('.animated-title__sparkles');
      if (sparkleContainer) {
        // Clear existing sparkles
        sparkleContainer.innerHTML = '';
        
        // Add new sparkles
        for (let i = 0; i < 6; i++) {
          const sparkle = document.createElement('div');
          sparkle.className = 'animated-title__sparkle';
          sparkle.style.left = `${Math.random() * 100}%`;
          sparkle.style.top = `${Math.random() * 100}%`;
          sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
          sparkleContainer.appendChild(sparkle);
          
          // Remove sparkle after animation
          setTimeout(() => {
            if (sparkle.parentNode) {
              sparkle.parentNode.removeChild(sparkle);
            }
          }, 1500);
        }
      }
    }
  };

  useEffect(() => {
    triggerSparkles();
  }, [isTransitioning]);

  return (
    <h1 className="hero__title">
      Create Magical 
      <span className="hero__title-highlight"> Stories</span>
      <br />
      <div className="animated-title">
        <div className="animated-title__sparkles"></div>
        <span 
          className={`animated-title__phrase ${
            currentPhrase === 'every' ? 'animated-title__phrase--active' : 'animated-title__phrase--inactive'
          }`}
        >
          for Every Child
        </span>
        <span 
          className={`animated-title__phrase ${
            currentPhrase === 'your' ? 'animated-title__phrase--active' : 'animated-title__phrase--inactive'
          }`}
        >
          for Your Child
        </span>
      </div>
    </h1>
  );
};

export default AnimatedTitle;