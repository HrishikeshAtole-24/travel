'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import './Header.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  
  // Use auth context
  const { user, isLoggedIn, logout, isLoading } = useAuth();

  // Check if we're on homepage or another page
  const isHomePage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check if mobile view
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('scroll', handleScroll);
    
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    logout('manual');
  };

  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setShowProfileDropdown(!showProfileDropdown);
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Always show scrolled state on non-homepage
  const shouldShowScrolledState = !isHomePage || isScrolled;

  return (
    <header className={`header ${shouldShowScrolledState ? 'header-scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link href="/" className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L3 9L16 16L29 9L16 2Z" fill="currentColor"/>
              <path d="M3 23L16 30L29 23V9L16 16L3 9V23Z" fill="currentColor" opacity="0.6"/>
            </svg>
            <span>SkyWings</span>
          </Link>

          {/* Business Links - MMT Style */}
          <div className="business-links">
            <Link href="/list-property" className="business-link">
              <i className="fas fa-building"></i>
              <div className="business-link-content">
                <span className="business-link-title">List Your Property</span>
                <span className="business-link-desc">Grow your business!</span>
              </div>
            </Link>
            <Link href="/mybiz" className="business-link">
              <i className="fas fa-briefcase"></i>
              <div className="business-link-content">
                <span className="business-link-title">Introducing myBiz</span>
                <span className="business-link-desc">Business Travel Solution</span>
              </div>
            </Link>
            {isLoggedIn && (
              <Link href="/wishlist" className="business-link">
                <i className="fas fa-heart"></i>
                <div className="business-link-content">
                  <span className="business-link-title">Wishlist</span>
                  <span className="business-link-desc">Save favourites</span>
                </div>
              </Link>
            )}
          </div>

          <nav className="nav-menu">
            <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              <i className="fas fa-home"></i>
              <div className="nav-link-content">
                <span className="nav-link-title">Home</span>
                <span className="nav-link-desc">Discover flights</span>
              </div>
            </Link>
            {isLoggedIn && (
              <Link href="/my-bookings" className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}>
                <i className="fas fa-ticket"></i>
                <div className="nav-link-content">
                  <span className="nav-link-title">My Bookings</span>
                  <span className="nav-link-desc">Track your trips</span>
                </div>
              </Link>
            )}
            <Link href="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>
              <i className="fas fa-headset"></i>
              <div className="nav-link-content">
                <span className="nav-link-title">Contact</span>
                <span className="nav-link-desc">24/7 Support</span>
              </div>
            </Link>
          </nav>

          <div className="header-actions">
            {isLoggedIn ? (
              <div className="profile-dropdown-container">
                <button className="profile-btn" onClick={toggleProfileDropdown}>
                  <div className="profile-avatar">
                    {getInitials()}
                  </div>
                  <span className="profile-name">
                    {user?.firstName || 'Profile'}
                  </span>
                  <i className="fas fa-chevron-down"></i>
                </button>
                
                {showProfileDropdown && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        {getInitials()}
                      </div>
                      <div className="dropdown-user-info">
                        <div className="dropdown-name">
                          {user?.firstName} {user?.lastName}
                        </div>
                        <div className="dropdown-email">{user?.email}</div>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-menu">
                      {/* Mobile-only: Business Links */}
                      {isMobile && (
                        <>
                          <Link href="/list-property" className="dropdown-item">
                            <i className="fas fa-building"></i>
                            <div className="dropdown-item-content">
                              <span className="dropdown-item-title">List Your Property</span>
                              <span className="dropdown-item-desc">Grow your business!</span>
                            </div>
                          </Link>
                          <Link href="/mybiz" className="dropdown-item">
                            <i className="fas fa-briefcase"></i>
                            <div className="dropdown-item-content">
                              <span className="dropdown-item-title">Introducing myBiz</span>
                              <span className="dropdown-item-desc">Business Travel Solution</span>
                            </div>
                          </Link>
                          <Link href="/wishlist" className="dropdown-item">
                            <i className="fas fa-heart"></i>
                            <div className="dropdown-item-content">
                              <span className="dropdown-item-title">Wishlist</span>
                              <span className="dropdown-item-desc">Save favourites</span>
                            </div>
                          </Link>
                          <div className="dropdown-divider"></div>
                        </>
                      )}
                      
                      {/* Mobile-only: Navigation Links */}
                      {isMobile && (
                        <>
                          <Link href="/" className="dropdown-item">
                            <i className="fas fa-home"></i>
                            <span>Home</span>
                          </Link>
                          <Link href="/my-bookings" className="dropdown-item">
                            <i className="fas fa-ticket"></i>
                            <span>My Bookings</span>
                          </Link>
                          <Link href="/contact" className="dropdown-item">
                            <i className="fas fa-headset"></i>
                            <span>Contact Us</span>
                          </Link>
                          <div className="dropdown-divider"></div>
                        </>
                      )}
                      
                      <Link href="/profile" className="dropdown-item">
                        <i className="fas fa-user"></i>
                        <span>Profile Settings</span>
                      </Link>
                      <button className="dropdown-item" onClick={handleLogout}>
                        <i className="fas fa-right-from-bracket"></i>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = '/auth/login'}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
