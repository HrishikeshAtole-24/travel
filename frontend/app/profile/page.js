'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import Icon from '../components/Icon/Icon';
import AccountNav from '../components/AccountNav/AccountNav';
import { CheckoutSection } from '../components/CheckoutSteps/CheckoutSteps';
import { PageSkeleton, StateMessage } from '../components/Skeleton/Skeleton';
import '../hotels/hotels.css';
import './profile.css';

export default function ProfilePage() {
  const { user, isLoggedIn, isLoading: authLoading, fetchUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      fetchProfile();
    }
  }, [authLoading, isLoggedIn]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/auth/profile');
      
      if (response.success && response.data?.user) {
        const user = response.data.user;
        setProfile(user);
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          email: user.email || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch profile');
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await apiClient.put('/auth/profile', formData);
      
      if (response.success) {
        setProfile(response.data?.user || formData);
        setIsEditing(false);
        // Show success message
        alert('Profile updated successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      console.error('Update profile error:', err);
    }
  };

  const getInitials = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return <><Header /><PageSkeleton label="Loading profile…" /></>;
  }

  if (error && !profile) {
    return (
      <>
        <Header />
        <main className="profile-page">
          <div className="container">
            <StateMessage icon="alert" tone="danger" title="We couldn’t load your profile"
              action={<button className="btn btn-primary" onClick={fetchProfile}>Try again</button>}>
              {error}
            </StateMessage>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const field = (name, label, props = {}) => (
    <label className="hb-field">
      <span className="form-label">{label}</span>
      <input className="form-input" id={name} name={name} value={formData[name]} onChange={handleChange} disabled={!isEditing} {...props} />
    </label>
  );

  return (
    <>
      <Header />
      <main className="profile-page">
        <div className="container acct-layout">
          <AccountNav active="profile" />

          <div className="acct-main">
            <header className="acct-head">
              <h1>Profile</h1>
              <p>Your details are used to pre-fill traveller and guest forms.</p>
            </header>

            <section className="acct-identity">
              <span className="acct-avatar">{getInitials()}</span>
              <div>
                <h2>{profile?.firstName} {profile?.lastName}</h2>
                <p>{profile?.email}</p>
                <div className="acct-badges">
                  {profile?.emailVerified && <span className="sw-badge sw-badge--success"><Icon name="check" size={12} /> Email verified</span>}
                  {profile?.phoneVerified && <span className="sw-badge sw-badge--success"><Icon name="check" size={12} /> Phone verified</span>}
                </div>
              </div>
              <dl className="acct-meta">
                <div><dt>Member since</dt><dd>{formatDate(profile?.createdAt)}</dd></div>
                <div><dt>Last sign-in</dt><dd>{formatDate(profile?.lastLogin)}</dd></div>
              </dl>
            </section>

            <CheckoutSection title="Personal information"
              aside={!isEditing ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>Edit</button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                  setIsEditing(false);
                  setFormData({ firstName: profile?.firstName || '', lastName: profile?.lastName || '', phone: profile?.phone || '', email: profile?.email || '' });
                }}>Cancel</button>
              )}>
              {error && <div className="hb-error" role="alert"><Icon name="alert" size={16} /> {error}</div>}
              <form onSubmit={handleSubmit} className="acct-form">
                <div className="hb-grid two">
                  {field('firstName', 'First name', { required: true })}
                  {field('lastName', 'Last name', { required: true })}
                  <label className="hb-field">
                    <span className="form-label">Email</span>
                    <input className="form-input" id="email" name="email" type="email" value={formData.email} disabled />
                    <span className="form-helper">Email can’t be changed</span>
                  </label>
                  {field('phone', 'Mobile number', { type: 'tel', placeholder: '+91 98765 43210' })}
                </div>
                {isEditing && (
                  <div className="acct-actions">
                    <button type="submit" className="btn btn-primary">Save changes</button>
                  </div>
                )}
              </form>
            </CheckoutSection>

            <CheckoutSection title="Sign-in & security">
              <div className="acct-row">
                <span className="acct-row__icon"><Icon name="shield-check" size={20} /></span>
                <div>
                  <strong>Password</strong>
                  <p>Need to reset it? Our support team will verify you and help.</p>
                </div>
                <Link href="/contact" className="btn btn-secondary btn-sm">Contact support</Link>
              </div>
            </CheckoutSection>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
