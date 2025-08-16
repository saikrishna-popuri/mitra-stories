import React, { useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';

const TransformationShowcase: React.FC = () => {
  const [activeStyle, setActiveStyle] = useState<'cartoonMagic' | 'heritage'>('cartoonMagic');

  const avatarStyles = {
    cartoonMagic: {
      pose1: {
        image: '/cartoon-magic-pose-1.png',
        color: '#3A5FCD',
        name: 'Cartoon Magic'
      },
      pose2: {
        image: '/cartoon-magic-pose-2.png',
        color: '#50C878',
        name: 'Cartoon Magic'
      },
    },
    heritage: {
      pose1: {
        image: '/heritage-pose-1.png',
        color: '#FFD700',
        name: 'Heritage'
      },
      pose2: {
        image: '/heritage-pose-2.png',
        color: '#FF7F50',
        name: 'Heritage'
      },
    }
  };

  const handleStyleChange = (style: 'cartoonMagic' | 'heritage') => {
    setActiveStyle(style);
  };

  return (
    <div className="transformation-showcase">
      <div className="transformation-showcase__container">
        <h3 className="transformation-showcase__title">
          ✨ Your Child Becomes the Hero! ✨
        </h3>
        
        <div className="transformation-showcase__display">
          {/* Before - Photo Upload */}
          <div className="transformation-showcase__before">
            <div className="transformation-showcase__image-container">
              <div className="transformation-showcase__placeholder transformation-showcase__placeholder--before transformation-showcase__photo">
              </div>
            </div>
          </div>

          {/* Arrow with Animation */}
          <div className="transformation-showcase__arrow">
            <div className="transformation-showcase__arrow-icon">
              →
            </div>
            <div className="transformation-showcase__sparkles">
              <Sparkles className="sparkle sparkle--1" size={16} />
              <Sparkles className="sparkle sparkle--2" size={12} />
              <Sparkles className="sparkle sparkle--3" size={14} />
            </div>
          </div>

          {/* After - Hero Avatars */}
          <div className="transformation-showcase__after">
            <div className="transformation-showcase__avatars">
              <div className={`transformation-showcase__avatar transformation-showcase__avatar--${activeStyle}`}
                   style={{ 
                     backgroundImage: `url(${avatarStyles[activeStyle].pose1.image})`
                   }}>
              </div>
              <div className={`transformation-showcase__avatar transformation-showcase__avatar--${activeStyle}`}
                   style={{ 
                     backgroundImage: `url(${avatarStyles[activeStyle].pose2.image})`
                   }}>
              </div>
            </div>
          </div>
        </div>

        {/* Style Selector */}
        <div className="transformation-showcase__styles">
          <div className="transformation-showcase__style-buttons">
            {Object.entries(avatarStyles).map(([key, style]) => (
              <button
                key={key}
                className={`transformation-showcase__style-btn ${
                  activeStyle === key ? 'transformation-showcase__style-btn--active' : ''
                }`}
                onClick={() => handleStyleChange(key as 'cartoonMagic' | 'heritage')}
              >
                {key === 'cartoonMagic' ? 'Cartoon Magic' : 'Heritage'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransformationShowcase;