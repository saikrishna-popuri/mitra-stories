import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = cardsRef.current.map((card, index) => {
      if (!card) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setVisibleCards(prev => {
                  const newVisible = [...prev];
                  newVisible[index] = true;
                  return newVisible;
                });
              }, index * 100); // Stagger animation by 100ms
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
  }, []);

  const steps = [
    {
      icon: '📚',
      number: '1',
      title: 'Choose a Story',
      text: 'Select a magical adventure'
    },
    {
      icon: '🌸',
      number: '2',
      title: 'Personalize Hero',
      text: 'Create Avatar or use a photo'
    },
    {
      icon: '✨',
      number: '3',
      title: 'Preview & Order',
      text: 'See the magic, receive the book'
    }
  ];

  return (
    <section className="how-it-works">
      <div className="how-it-works__container">
        <div className="how-it-works__badge">
          How it works?
        </div>
        
        <div className="how-it-works__steps">
          {steps.map((step, index) => (
            <div
              key={index}
              ref={el => cardsRef.current[index] = el}
              className={`how-it-works__card ${visibleCards[index] ? 'how-it-works__card--visible' : ''}`}
            >
              <div className="how-it-works__card-number">
                {step.number}
              </div>
              <div className="how-it-works__card-icon">
                {step.icon}
              </div>
              <h3 className="how-it-works__card-title">
                {step.title}
              </h3>
              <p className="how-it-works__card-text">
                {step.text}
              </p>
            </div>
          ))}
        </div>

        <p className="how-it-works__tagline">
          Crafted with love, rooted in Culture. Create a gift they'll treasure forever.
        </p>

        <div className="how-it-works__ctas">
          <Link to="/stories" className="btn btn--primary btn--sparkle">
            <Sparkles className="btn__icon sparkle-float" />
            Choose Story
            <div className="sparkle-effect"></div>
          </Link>
          <span className="how-it-works__or">or</span>
          <button className="btn btn--secondary btn--sparkle">
            <Users className="btn__icon sparkle-float" />
            Create Avatar
            <div className="sparkle-effect"></div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;