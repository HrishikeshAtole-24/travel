'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import '../auth.css';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Please agree to Terms & Conditions');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, countryCode, ...signupData } = formData;
      const response = await apiClient.post('/auth/signup', {
        ...signupData,
        phone: `${countryCode}${formData.phone}`
      });
      
      if (response.success) {
        router.push('/auth/login');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider) => {
    alert(`${provider} signup coming soon!`);
  };

  return (
    <div className="auth-page-container">
      {/* Left Side - Promotional Banner */}
      <div className="auth-promo-side signup-promo">
        <div className="promo-content">
          <div className="promo-logo">
            <i className="fas fa-plane"></i>
            <h1>SkyWings</h1>
          </div>
          <h2>Join 10 Million+ Happy Travelers</h2>
          <p className="promo-subtitle">Create your account and unlock exclusive benefits</p>
          
          <div className="signup-perks">
            <div className="perk-item">
              <div className="perk-number">1</div>
              <div>
                <h3>Create Free Account</h3>
                <p>Quick signup in under 60 seconds</p>
              </div>
            </div>
            <div className="perk-item">
              <div className="perk-number">2</div>
              <div>
                <h3>Get ₹500 Welcome Bonus</h3>
                <p>On your first booking</p>
              </div>
            </div>
            <div className="perk-item">
              <div className="perk-number">3</div>
              <div>
                <h3>Unlock Premium Deals</h3>
                <p>Access to exclusive member-only prices</p>
              </div>
            </div>
          </div>

          <div className="trust-badges">
            <div className="trust-item">
              <i className="fas fa-shield-alt"></i>
              <span>Secure Payments</span>
            </div>
            <div className="trust-item">
              <i className="fas fa-lock"></i>
              <span>Data Protected</span>
            </div>
            <div className="trust-item">
              <i className="fas fa-star"></i>
              <span>4.8★ Rated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="auth-form-side">
        <div className="auth-card-modern signup-card">
          <div className="auth-header-modern">
            <h2>Create Your Account</h2>
            <p>Start your journey in minutes</p>
          </div>

          {error && (
            <div className="error-message-modern">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Social Signup First */}
          <div className="social-signup-top">
            <button 
              type="button" 
              className="social-btn-large google-btn"
              onClick={() => handleSocialSignup('Google')}
            >
              <i className="fab fa-google"></i>
              Continue with Google
            </button>
            <button 
              type="button" 
              className="social-btn-large facebook-btn"
              onClick={() => handleSocialSignup('Facebook')}
            >
              <i className="fab fa-facebook-f"></i>
              Continue with Facebook
            </button>
          </div>

          <div className="divider">
            <span>Or sign up with email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-modern">
            <div className="form-row-modern">
              <div className="form-group-modern half">
                <label htmlFor="firstName">
                  <i className="fas fa-user"></i>
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                  className="modern-input"
                />
              </div>

              <div className="form-group-modern half">
                <label htmlFor="lastName">
                  <i className="fas fa-user"></i>
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                  className="modern-input"
                />
              </div>
            </div>

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
                placeholder="john.doe@example.com"
                className="modern-input"
              />
            </div>

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
                  placeholder="9876543210"
                  className="modern-input phone-input"
                />
              </div>
            </div>

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
                placeholder="At least 6 characters"
                className="modern-input"
              />
              <small className="password-hint">
                <i className="fas fa-info-circle"></i>
                Use 6+ characters with letters & numbers
              </small>
            </div>

            <div className="form-group-modern">
              <label htmlFor="confirmPassword">
                <i className="fas fa-lock"></i>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
                className="modern-input"
              />
            </div>

            <label className="terms-checkbox">
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>
                I agree to <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>
              </span>
            </label>

            <button 
              type="submit" 
              className="btn-modern btn-primary-modern"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-modern">
            <p>
              Already a member? <Link href="/auth/login">Sign in</Link>
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
