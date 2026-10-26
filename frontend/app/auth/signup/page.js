'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthPromo from '../AuthPromo';
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


  return (
    <div className="auth-page-container">
      <AuthPromo mode="signup" />

      {/* Right Side - Signup Form */}
      <div className="auth-form-side">
        <div className="auth-card-modern signup-card">
          <div className="auth-header-modern">
            <h2>Create your account</h2>
            <p>It’s free and takes a minute.</p>
          </div>

          {error && (
            <div className="error-message-modern">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-modern">
            <div className="form-row-modern">
              <div className="form-group-modern half">
                <label htmlFor="firstName">
                  <i className="fas fa-user"></i>
                  First name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Rahul"
                  className="modern-input"
                />
              </div>

              <div className="form-group-modern half">
                <label htmlFor="lastName">
                  <i className="fas fa-user"></i>
                  Last name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Mehta"
                  className="modern-input"
                />
              </div>
            </div>

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
                placeholder="you@example.com"
                className="modern-input"
              />
            </div>

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
                Confirm password
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
                I agree to the <Link href="/terms-and-conditions">Terms</Link> and <Link href="/privacy-policy">Privacy policy</Link>
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
                  Creating account…
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  Create account
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

        {/* Back to home */}
        <Link href="/" className="back-home-link">
          <i className="fas fa-arrow-left"></i>
          Back to home
        </Link>
      </div>
    </div>
  );
}
