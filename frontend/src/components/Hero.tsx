import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';
import TransformationShowcase from './TransformationShowcase';
import AnimatedTitle from './AnimatedTitle';
import MagicFigure from './MagicFigure';

const Hero: React.FC = () => {
  const [currentAnimatedPhrase, setCurrentAnimatedPhrase] = useState<'every' | 'your'>('every');
  const [isTitleTransitioning, setIsTitleTransitioning] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<'cartoonMagic' | 'heritage'>('cartoonMagic');
  const [triggerShimmer1, setTriggerShimmer1] = useState(false);
  const [triggerShimmer2, setTriggerShimmer2] = useState(false);
  const [shimmerKey1, setShimmerKey1] = useState(0);
  const [shimmerKey2, setShimmerKey2] = useState(0);

  // Refs to store timeout IDs for proper cleanup
  const triggerTimeout1Ref = useRef<NodeJS.Timeout | null>(null);
  const triggerTimeout2Ref = useRef<NodeJS.Timeout | null>(null);
  const shimmerStopTimeout1Ref = useRef<NodeJS.Timeout | null>(null);
  const shimmerStopTimeout2Ref = useRef<NodeJS.Timeout | null>(null);

  // Helper function to clear all timeouts
  const clearAllTimeouts = () => {
    if (triggerTimeout1Ref.current) clearTimeout(triggerTimeout1Ref.current);
    if (triggerTimeout2Ref.current) clearTimeout(triggerTimeout2Ref.current);
    if (shimmerStopTimeout1Ref.current) clearTimeout(shimmerStopTimeout1Ref.current);
    if (shimmerStopTimeout2Ref.current) clearTimeout(shimmerStopTimeout2Ref.current);
    triggerTimeout1Ref.current = null;
    triggerTimeout2Ref.current = null;
    shimmerStopTimeout1Ref.current = null;
    shimmerStopTimeout2Ref.current = null;
  };

  useEffect(() => {
    if (isTitleTransitioning) {
      // When text transition starts, pause shimmers to prepare for re-sync
      setTriggerShimmer1(false);
      setTriggerShimmer2(false);
      clearAllTimeouts();
    } else {
      // Clear any existing timeouts before setting new ones
      clearAllTimeouts();
      
      // When text transition completes, trigger shimmers sequentially for one cycle each
      triggerTimeout1Ref.current = setTimeout(() => {
        // Start first button's shimmer after initial delay
        setTriggerShimmer1(true);
        setShimmerKey1(prev => prev + 1); // Increment key to force remount
        // Stop first button's shimmer after animation duration
        shimmerStopTimeout1Ref.current = setTimeout(() => {
          setTriggerShimmer1(false);
        }, 3000);
      }, 100);
      
      triggerTimeout2Ref.current = setTimeout(() => {
        // Start second button's shimmer after 1 second delay
        setTriggerShimmer2(true);
        setShimmerKey2(prev => prev + 1); // Increment key to force remount
        // Stop second button's shimmer after animation duration
        shimmerStopTimeout2Ref.current = setTimeout(() => {
          setTriggerShimmer2(false);
        }, 3000);
      }, 1100); // 100ms initial + 1000ms delay
    }
    
    return () => {
      clearAllTimeouts();
    };
  }, [isTitleTransitioning]);

  return (
    <section className="hero">
      <div className="hero__background"></div>
      <div className="hero__container">
        <div className="hero__content">
          <AnimatedTitle 
            onPhraseChange={setCurrentAnimatedPhrase} 
            onTransitionChange={setIsTitleTransitioning}
          />
          <p className="hero__description">
            Personalized storybooks that spark imagination and bring joy. 
            Create unique adventures tailored just for your little one.
          </p>
          <TransformationShowcase 
            activeStyle={selectedAvatarStyle}
            onStyleChange={setSelectedAvatarStyle}
          />
          <div className="hero__ctas">
            <Link to="/stories" className="btn btn--primary btn--sparkle">
              <Sparkles className="btn__icon sparkle-float" />
             Choose Story
              <div 
                key={shimmerKey1}
                className="sparkle-effect"
                style={{ animationPlayState: triggerShimmer1 ? 'running' : 'paused' }}
              ></div>
            </Link>
            <button className="btn btn--secondary btn--sparkle">
              <Users className="btn__icon sparkle-float" />
             Create Avatar
              <div 
                key={shimmerKey2}
                className="sparkle-effect"
                style={{ animationPlayState: triggerShimmer2 ? 'running' : 'paused' }}
              ></div>
            </button>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__book">
            <div className="book-cover">
              <MagicFigure 
                activePhrase={currentAnimatedPhrase}
                isTitleTransitioning={isTitleTransitioning}
                selectedAvatarStyle={selectedAvatarStyle}
              />
              <div className="book-spine"></div>
              <div className="book-pages"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;