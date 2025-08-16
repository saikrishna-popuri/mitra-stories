import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Trust Bar - Only visible on mobile */}
      <div className="mobile-trust-bar">
        <div className="mobile-trust-bar__container">
          <div className="mobile-trust-bar__item">
            <span className="mobile-trust-bar__text">
              ❤️ Loved by <span className="mobile-trust-bar__highlight">1000+</span> Parents
            </span>
          </div>
          <div className="mobile-trust-bar__item">
            <span className="mobile-trust-bar__text">
              🎁 Perfect Birthday Gift
            </span>
          </div>
        </div>
      </div>
      
      <header className={`header ${isScrolled ? 'header--scrolled' : ''}`}>
      <div className="header__container">
        <Link to="/" className="header__logo">
          <img 
            src="/logo.png" 
            alt="Mitra - Personalized Children's Storybooks" 
            className="header__logo-image"
          />
        </Link>

        <nav className={`header__nav ${isMobileMenuOpen ? 'header__nav--open' : ''}`}>
          <ul className="header__nav-list">
            <li><Link to="/stories" className="header__nav-link">Stories</Link></li>
            <li><Link to="/create" className="header__nav-link">Create</Link></li>
            <li><Link to="/library" className="header__nav-link">My Library</Link></li>
            <li><Link to="/about" className="header__nav-link">About</Link></li>
          </ul>
          <div className="header__auth">
            <button className="btn btn--ghost">Sign In</button>
            <button className="btn btn--primary">Get Started</button>
          </div>
        </nav>

        <button 
          className="header__mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      </header>
    </>
  );
};

export default Header;