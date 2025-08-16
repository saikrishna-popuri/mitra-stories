import React from 'react';

const TrustBar: React.FC = () => {
  return (
    <section className="trust-bar">
      <div className="trust-bar__container">
        <div className="trust-bar__item">
          <span className="trust-bar__text">
            ❤️ Loved by <span className="trust-bar__highlight">1000+</span> Happy Parents
          </span>
        </div>
        
        <div className="trust-bar__item">
          <span className="trust-bar__text">
            🎁 Perfect Birthday Gift
          </span>
        </div>
        
        <div className="trust-bar__item">
          <span className="trust-bar__text">
            🇮🇳 Proudly Made in India
          </span>
        </div>
      </div>
    </section>
  );
};

export default TrustBar;