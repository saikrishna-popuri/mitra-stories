import React from 'react';
import Hero from '../components/Hero';
import TrustBar from '../components/TrustBar';
import FloatingElements from '../components/FloatingElements';
import HowItWorks from '../components/HowItWorks';
import StoriesSection from '../components/StoriesSection';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <StoriesSection />
      </main>
      <FloatingElements />
    </div>
  );
};

export default Home;