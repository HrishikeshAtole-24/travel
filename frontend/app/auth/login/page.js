'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthPromo from '../AuthPromo';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import '../auth.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggedIn } = useAuth();
  
  const [authMethod, setAuthMethod] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    countryCode: '+91',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false);

  useEffect(() => {
    // Check if redirected due to session expiry
    if (searchParams.get('reason') === 'session_expired') {
      setSessionExpiredMsg(true);
    }
    
    // Redirect if already logged in
    if (isLoggedIn) {
      const returnUrl = searchParams.get('returnUrl') || '/';
      router.push(decodeURIComponent(returnUrl));
    }
  }, [isLoggedIn, searchParams, router]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSessionExpiredMsg(false);
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      if (response.success && response.data?.token) {
        await login(response.data.token);
        const returnUrl = searchParams.get('returnUrl') || '/';
        router.push(decodeURIComponent(returnUrl));
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-page-container">
      <AuthPromo mode="login" />

      {/* Right Side - Login Form */}
      <div className="auth-form-side">
        <div className="auth-card-modern">
          <div className="auth-header-modern">
            <h2>Sign in</h2>
            <p>Use your email or mobile number.</p>
          </div>

          {sessionExpiredMsg && (
            <div className="session-expired-message">
              <i className="fas fa-clock"></i>
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="error-message-modern">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Auth Method Tabs */}
          <div className="auth-method-tabs">
            <button
              type="button"
              className={`method-tab ${authMethod === 'email' ? 'active' : ''}`}
              onClick={() => setAuthMethod('email')}
            >
              <i className="fas fa-envelope"></i>
              Email
            </button>
            <button
              type="button"
              className={`method-tab ${authMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setAuthMethod('phone')}
            >
              <i className="fas fa-mobile-alt"></i>
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-modern">
            {authMethod === 'email' ? (
              <div className="form-group-modern">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  className="modern-input"
                />
              </div>
            ) : (
              <div className="form-group-modern">
                <label htmlFor="phone">
                  <i className="fas fa-mobile-alt"></i>
                  Mobile number
                </label>
                <div className="phone-input-group">
                  <select 
                    name="countryCode" 
                    value={formData.countryCode}
                    onChange={handleChange}
                    className="country-code-select"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter mobile number"
                    className="modern-input phone-input"
                  />
                </div>
              </div>
            )}

            <div className="form-group-modern">
              <label htmlFor="password">
                <i className="fas fa-lock"></i>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="modern-input"
              />
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Link href="/contact" className="forgot-password">Forgot password?</Link>
            </div>

            <button 
              type="submit" 
              className="btn-modern btn-primary-modern"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Signing in…
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Sign in
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-modern">
            <p>
              New to SkyWings? <Link href="/auth/signup">Create an account</Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <Link href="/" className="back-home-link">
          <i className="fas fa-arrow-left"></i>
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
