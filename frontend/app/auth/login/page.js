'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import '../auth.css';

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    countryCode: '+91',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      if (response.success && response.data?.token) {
        apiClient.setToken(response.data.token);
        router.push('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    alert(`${provider} login coming soon!`);
  };

  return (
    <div className="auth-page-container">
      {/* Left Side - Promotional Banner */}
      <div className="auth-promo-side">
        <div className="promo-content">
          <div className="promo-logo">
            <i className="fas fa-plane"></i>
            <h1>SkyWings</h1>
          </div>
          <h2>Welcome Back!</h2>
          <p className="promo-subtitle">Sign in to unlock amazing benefits</p>
          
          <div className="promo-benefits">
            <div className="benefit-item">
              <div className="benefit-icon"><i className="fas fa-bolt"></i></div>
              <div>
                <h3>Lightning Fast Bookings</h3>
                <p>Book flights in under 60 seconds</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon"><i className="fas fa-gift"></i></div>
              <div>
                <h3>Exclusive Deals & Offers</h3>
                <p>Save up to 40% on your bookings</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon"><i className="fas fa-history"></i></div>
              <div>
                <h3>Easy Booking Management</h3>
                <p>Track and manage all your trips</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon"><i className="fas fa-headset"></i></div>
              <div>
                <h3>24/7 Customer Support</h3>
                <p>We're here to help anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="auth-form-side">
        <div className="auth-card-modern">
          <div className="auth-header-modern">
            <h2>Sign In</h2>
            <p>Continue your journey with us</p>
          </div>

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
                  Email Address
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
                  Mobile Number
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
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>

            <button 
              type="submit" 
              className="btn-modern btn-primary-modern"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Signing In...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Social Login */}
          <div className="social-login-section">
            <div className="divider">
              <span>Or continue with</span>
            </div>
            
            <div className="social-buttons">
              <button 
                type="button" 
                className="social-btn google-btn"
                onClick={() => handleSocialLogin('Google')}
              >
                <i className="fab fa-google"></i>
                Google
              </button>
              <button 
                type="button" 
                className="social-btn facebook-btn"
                onClick={() => handleSocialLogin('Facebook')}
              >
                <i className="fab fa-facebook-f"></i>
                Facebook
              </button>
              <button 
                type="button" 
                className="social-btn apple-btn"
                onClick={() => handleSocialLogin('Apple')}
              >
                <i className="fab fa-apple"></i>
                Apple
              </button>
            </div>
          </div>

          <div className="auth-footer-modern">
            <p>
              New to SkyWings? <Link href="/auth/signup">Create an account</Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <Link href="/" className="back-home-link">
          <i className="fas fa-arrow-left"></i>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
