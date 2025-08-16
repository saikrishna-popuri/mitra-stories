import React, { useState, useEffect, useRef } from 'react';

interface MagicFigureProps {
  activePhrase: 'every' | 'your';
  isTitleTransitioning: boolean;
  selectedAvatarStyle: 'cartoonMagic' | 'heritage';
}

const MagicFigure: React.FC<MagicFigureProps> = ({ activePhrase, isTitleTransitioning, selectedAvatarStyle }) => {
  const [isVisibleDelayed, setIsVisibleDelayed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Handle avatar visibility based on phrase and transition state
    if (activePhrase === 'your' && !isTitleTransitioning) {
      // "Your Child" phrase just became active, show avatar with 0.5s delay
      timeoutRef.current = setTimeout(() => {
        setIsVisibleDelayed(true);
      }, 500);
    } else if (activePhrase === 'your' && isTitleTransitioning) {
      // "Your Child" phrase is transitioning out, hide avatar with 0.5s delay
      timeoutRef.current = setTimeout(() => {
        setIsVisibleDelayed(false);
      }, 500);
    } else if (activePhrase === 'every' && !isTitleTransitioning) {
      // "Every Child" phrase is active, ensure avatar is hidden
      setIsVisibleDelayed(false);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activePhrase, isTitleTransitioning]);

  // Determine which sprite image to use based on selected avatar style
  const getSpriteImage = () => {
    return selectedAvatarStyle === 'cartoonMagic' 
      ? '/gpt_split1_sprite_1.png' 
      : '/heritage-pose-1.png';
  };
  return (
    <img 
      src={getSpriteImage()} 
      alt="Magical Figure"
      className={`magic-figure-image ${isVisibleDelayed ? 'magic-figure-image--visible' : ''} ${selectedAvatarStyle === 'heritage' ? 'magic-figure-image--heritage' : ''}`}
    />
  );
};

export default MagicFigure;