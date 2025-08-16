import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';
import TransformationShowcase from './TransformationShowcase';
import AnimatedTitle from './AnimatedTitle';
import MagicFigure from './MagicFigure';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="hero__background"></div>
      <div className="hero__container">
        <div className="hero__content">
          <AnimatedTitle />
          <p className="hero__description">
            Personalized storybooks that spark imagination and bring joy. 
            Create unique adventures tailored just for your little one.
          </p>
          <TransformationShowcase />
          <div className="hero__ctas">
            <Link to="/stories" className="btn btn--primary btn--sparkle">
              <Sparkles className="btn__icon sparkle-float" />
             Choose Story
              <div className="sparkle-effect"></div>
            </Link>
            <button className="btn btn--secondary btn--sparkle">
              <Users className="btn__icon sparkle-float" />
             Create Avatar
              <div className="sparkle-effect"></div>
            </button>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__book">
            <div className="book-cover">
              <div className="book-spine"></div>
              <div className="book-pages"></div>
            </div>
            <MagicFigure />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;