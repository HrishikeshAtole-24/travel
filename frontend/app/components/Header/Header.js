'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import './Header.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const pathname = usePathname();

  // Check if we're on homepage or another page
  const isHomePage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check if user is logged in and fetch profile
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    if (token) {
      fetchUserProfile();
    }

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
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      if (response.success && response.data?.user) {
        setUserProfile(response.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserProfile(null);
    setShowProfileDropdown(false);
    window.location.href = '/';
  };

  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setShowProfileDropdown(!showProfileDropdown);
  };

  const getInitials = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
    }
    if (userProfile?.email) {
      return userProfile.email[0].toUpperCase();
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

          <nav className="nav-menu">
            <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
            <Link href="/search" className={`nav-link ${isActive('/search') ? 'active' : ''}`}>Flights</Link>
            <Link href="/my-bookings" className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}>My Bookings</Link>
            <Link href="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>
          </nav>

          <div className="header-actions">
            {isLoggedIn ? (
              <div className="profile-dropdown-container">
                <button className="profile-btn" onClick={toggleProfileDropdown}>
                  <div className="profile-avatar">
                    {getInitials()}
                  </div>
                  <span className="profile-name">
                    {userProfile?.firstName || 'Profile'}
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
                          {userProfile?.firstName} {userProfile?.lastName}
                        </div>
                        <div className="dropdown-email">{userProfile?.email}</div>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-menu">
                      <Link href="/my-bookings" className="dropdown-item">
                        <i className="fas fa-ticket"></i>
                        <span>My Bookings</span>
                      </Link>
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
