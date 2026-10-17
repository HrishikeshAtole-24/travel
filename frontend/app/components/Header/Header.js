'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import Icon, { Logo } from '../Icon/Icon';
import './Header.css';

const NAV = [
  { href: '/', label: 'Flights', icon: 'plane', match: (p, tab) => (p === '/' && tab !== 'hotels') || p.startsWith('/search') || p.startsWith('/booking') },
  { href: '/?tab=hotels', label: 'Hotels', icon: 'hotel', match: (p, tab) => (p === '/' && tab === 'hotels') || p.startsWith('/hotels') },
  { href: '/my-bookings', label: 'My trips', icon: 'ticket', match: (p) => p.startsWith('/my-bookings') },
  { href: '/contact', label: 'Support', icon: 'headset', match: (p) => p.startsWith('/contact') }
];

// useSearchParams needs a Suspense boundary; the fallback renders without the tab
export default function Header() {
  return (
    <Suspense fallback={<HeaderBar tab={null} />}>
      <HeaderWithTab />
    </Suspense>
  );
}

function HeaderWithTab() {
  const searchParams = useSearchParams();
  return <HeaderBar tab={searchParams?.get('tab')} />;
}

function HeaderBar({ tab }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const { user, isLoggedIn, logout } = useAuth();

  // Only the homepage hero sits under a transparent header
  const isHomePage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown-container')) setShowProfileDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Close the mobile sheet on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname, tab]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    setMenuOpen(false);
    logout('manual');
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const transparent = isHomePage && !isScrolled && !menuOpen;

  return (
    <header className={`header ${transparent ? 'header--transparent' : 'header--solid'}`}>
      <div className="container header-content">
        <Link href="/" className="header-brand" aria-label="SkyWings home">
          <Logo inverse={transparent} />
        </Link>

        <nav className="nav-menu" aria-label="Main">
          {NAV.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-link ${item.match(pathname, tab) ? 'active' : ''}`}
              aria-current={item.match(pathname, tab) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <span className="header-currency" title="Prices shown in Indian rupees">INR ₹</span>

          {isLoggedIn && (
            <Link href="/wishlist" className="header-icon-btn" aria-label="Wishlist">
              <Icon name="heart" size={20} />
            </Link>
          )}

          {isLoggedIn ? (
            <div className="profile-dropdown-container">
              <button
                className="profile-btn"
                onClick={(e) => { e.stopPropagation(); setShowProfileDropdown(v => !v); }}
                aria-expanded={showProfileDropdown}
                aria-haspopup="menu"
              >
                <span className="profile-avatar">{getInitials()}</span>
                <span className="profile-name">{user?.firstName || 'Account'}</span>
                <Icon name="chevron-down" size={16} />
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown" role="menu">
                  <div className="dropdown-header">
                    <span className="dropdown-avatar">{getInitials()}</span>
                    <div className="dropdown-user-info">
                      <div className="dropdown-name">{user?.firstName} {user?.lastName}</div>
                      <div className="dropdown-email">{user?.email}</div>
                    </div>
                  </div>
                  <div className="dropdown-menu">
                    <Link href="/my-bookings" className="dropdown-item" role="menuitem"><Icon name="ticket" size={18} /><span>My trips</span></Link>
                    <Link href="/wishlist" className="dropdown-item" role="menuitem"><Icon name="heart" size={18} /><span>Wishlist</span></Link>
                    <Link href="/profile" className="dropdown-item" role="menuitem"><Icon name="settings" size={18} /><span>Profile settings</span></Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item dropdown-item--danger" onClick={handleLogout} role="menuitem">
                      <Icon name="log-out" size={18} /><span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className="btn btn-primary btn-sm header-signin">
              <Icon name="user" size={16} />
              Sign in
            </Link>
          )}

          <button
            className="header-icon-btn header-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-sheet">
          <nav className="mobile-sheet__nav" aria-label="Mobile">
            {NAV.map(item => (
              <Link key={item.label} href={item.href} className={`mobile-sheet__link ${item.match(pathname, tab) ? 'active' : ''}`}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
                <Icon name="chevron-right" size={18} className="mobile-sheet__chev" />
              </Link>
            ))}
          </nav>
          <div className="mobile-sheet__group">
            <p className="sw-overline">For business</p>
            <Link href="/list-property" className="mobile-sheet__link"><Icon name="building" size={20} /><span>List your property</span></Link>
            <Link href="/mybiz" className="mobile-sheet__link"><Icon name="briefcase" size={20} /><span>myBiz for companies</span></Link>
          </div>
          {isLoggedIn ? (
            <button className="btn btn-secondary btn-lg btn-block" onClick={handleLogout}>
              <Icon name="log-out" size={18} /> Log out
            </button>
          ) : (
            <Link href="/auth/login" className="btn btn-primary btn-lg btn-block">Sign in or create account</Link>
          )}
        </div>
      )}
    </header>
  );
}
