'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import './Header.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
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
              <div className="user-menu">
                <button className="btn btn-ghost" onClick={() => window.location.href = '/my-bookings'}>
                  My Trips
                </button>
                <button className="btn btn-outline" onClick={handleLogout}>
                  Logout
                </button>
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
