'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/lib/api/client';
import './auth.css';

const AuthContext = createContext(null);

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/my-bookings',
  '/profile',
  '/wishlist',
  '/booking',
  '/payment',
  '/payment-success',
  '/payment-failed',
  '/confirmation'
];

// Routes that extend session timeout (payment flow)
const PAYMENT_ROUTES = ['/payment', '/booking'];

// Routes visible only when logged OUT
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/signup'];

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionConfig, setSessionConfig] = useState({
    sessionTimeoutMinutes: 60,
    paymentExtensionMinutes: 20
  });
  const sessionTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Fetch session config from backend
  const fetchSessionConfig = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/session-config');
      if (response.success && response.data) {
        setSessionConfig(response.data);
      }
    } catch (error) {
      console.warn('Using default session config');
    }
  }, []);

  // Get login time from token
  const getLoginTime = useCallback(() => {
    const token = apiClient.getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.loginTime || null;
    } catch {
      return null;
    }
  }, []);

  // Check if session has expired
  const isSessionExpired = useCallback(() => {
    const loginTime = getLoginTime();
    if (!loginTime) return true;

    const now = Date.now();
    const elapsed = now - loginTime;
    
    // Check if on payment routes (extended timeout)
    const isPaymentFlow = PAYMENT_ROUTES.some(route => pathname?.startsWith(route));
    const totalTimeout = isPaymentFlow 
      ? (sessionConfig.sessionTimeoutMinutes + sessionConfig.paymentExtensionMinutes) * 60 * 1000
      : sessionConfig.sessionTimeoutMinutes * 60 * 1000;

    return elapsed >= totalTimeout;
  }, [getLoginTime, pathname, sessionConfig]);

  // Logout function
  const logout = useCallback((reason = 'manual') => {
    apiClient.removeToken();
    localStorage.removeItem('sessionWarningShown');
    setUser(null);
    setIsLoggedIn(false);
    setShowSessionWarning(false);
    
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    if (reason === 'timeout') {
      router.push('/auth/login?reason=session_expired');
    } else {
      router.push('/');
    }
  }, [router]);

  // Setup session timeout timer
  const setupSessionTimer = useCallback(() => {
    const loginTime = getLoginTime();
    if (!loginTime) return;

    // Clear existing timers
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    const now = Date.now();
    const elapsed = now - loginTime;
    
    const isPaymentFlow = PAYMENT_ROUTES.some(route => pathname?.startsWith(route));
    const totalTimeoutMs = isPaymentFlow
      ? (sessionConfig.sessionTimeoutMinutes + sessionConfig.paymentExtensionMinutes) * 60 * 1000
      : sessionConfig.sessionTimeoutMinutes * 60 * 1000;
    
    const remaining = totalTimeoutMs - elapsed;
    const warningTime = remaining - (5 * 60 * 1000); // 5 min warning

    if (remaining <= 0) {
      logout('timeout');
      return;
    }

    // Set warning timer (5 min before expiry)
    if (warningTime > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowSessionWarning(true);
      }, warningTime);
    }

    // Set logout timer
    sessionTimerRef.current = setTimeout(() => {
      logout('timeout');
    }, remaining);
  }, [getLoginTime, pathname, sessionConfig, logout]);

  // Extend session (for payment flow)
  const extendSession = useCallback(() => {
    setShowSessionWarning(false);
    setupSessionTimer();
  }, [setupSessionTimer]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return response.data.user;
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Token might be invalid
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        logout('timeout');
      }
    }
    return null;
  }, [logout]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await fetchSessionConfig();
      
      const token = apiClient.getToken();
      
      if (token) {
        // Check session expiry
        if (isSessionExpired()) {
          logout('timeout');
          setIsLoading(false);
          return;
        }
        
        setIsLoggedIn(true);
        await fetchUserProfile();
        setupSessionTimer();
      }
      
      setIsLoading(false);
    };

    initAuth();

    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // Re-setup timer when route changes (for payment extension)
  useEffect(() => {
    if (isLoggedIn) {
      setupSessionTimer();
    }
  }, [pathname, isLoggedIn]);

  // Handle route protection
  useEffect(() => {
    if (isLoading) return;

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname?.startsWith(route));
    const isGuestRoute = GUEST_ONLY_ROUTES.some(route => pathname?.startsWith(route));

    if (isProtectedRoute && !isLoggedIn) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/auth/login?returnUrl=${returnUrl}`);
    } else if (isGuestRoute && isLoggedIn) {
      // Redirect logged-in users away from auth pages
      router.push('/');
    }
  }, [pathname, isLoggedIn, isLoading, router]);

  // Login function
  const login = useCallback(async (token) => {
    apiClient.setToken(token);
    setIsLoggedIn(true);
    await fetchUserProfile();
    setupSessionTimer();
  }, [fetchUserProfile, setupSessionTimer]);

  // Check if route is protected
  const isProtectedRoute = useCallback((path) => {
    return PROTECTED_ROUTES.some(route => path?.startsWith(route));
  }, []);

  const value = {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    fetchUserProfile,
    isProtectedRoute,
    sessionConfig,
    showSessionWarning,
    extendSession,
    getTimeRemaining: () => {
      const loginTime = getLoginTime();
      if (!loginTime) return 0;
      const isPaymentFlow = PAYMENT_ROUTES.some(route => pathname?.startsWith(route));
      const totalTimeoutMs = isPaymentFlow
        ? (sessionConfig.sessionTimeoutMinutes + sessionConfig.paymentExtensionMinutes) * 60 * 1000
        : sessionConfig.sessionTimeoutMinutes * 60 * 1000;
      return Math.max(0, totalTimeoutMs - (Date.now() - loginTime));
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Session Warning Modal */}
      {showSessionWarning && (
        <div className="session-warning-overlay">
          <div className="session-warning-modal">
            <div className="session-warning-icon">
              <i className="fas fa-clock"></i>
            </div>
            <h3>Session Expiring Soon</h3>
            <p>Your session will expire in 5 minutes due to inactivity.</p>
            <div className="session-warning-actions">
              <button onClick={extendSession} className="btn-extend">
                Stay Logged In
              </button>
              <button onClick={() => logout('manual')} className="btn-logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { PROTECTED_ROUTES, GUEST_ONLY_ROUTES };
