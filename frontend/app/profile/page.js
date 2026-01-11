'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import apiClient from '@/lib/api/client';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
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
    const token = apiClient.getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchProfile();
  }, []);

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
    return (
      <>
        <Header />
        <main className="profile-page">
          <div className="container">
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error && !profile) {
    return (
      <>
        <Header />
        <main className="profile-page">
          <div className="container">
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Profile</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchProfile}>
                Try Again
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="profile-page">
        <div className="container">
          {/* Page Header */}
          <div className="profile-header">
            <div className="header-left">
              <h1><i className="fas fa-user-circle"></i> My Profile</h1>
              <p>Manage your account information and preferences</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => router.push('/my-bookings')}
            >
              <i className="fas fa-ticket"></i> My Bookings
            </button>
          </div>

          {/* Profile Content */}
          <div className="profile-content">
            {/* Profile Card */}
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  {getInitials()}
                </div>
                <div className="profile-basic-info">
                  <h2>{profile?.firstName} {profile?.lastName}</h2>
                  <p className="profile-email">{profile?.email}</p>
                  <div className="profile-badges">
                    {profile?.emailVerified && (
                      <span className="badge badge-success">
                        <i className="fas fa-check-circle"></i> Email Verified
                      </span>
                    )}
                    {profile?.phoneVerified && (
                      <span className="badge badge-success">
                        <i className="fas fa-check-circle"></i> Phone Verified
                      </span>
                    )}
                    {profile?.status === 'active' && (
                      <span className="badge badge-info">
                        <i className="fas fa-circle-check"></i> Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="profile-stats">
                <div className="stat-item">
                  <i className="fas fa-calendar-plus"></i>
                  <span className="stat-label">Member Since</span>
                  <span className="stat-value">{formatDate(profile?.createdAt)}</span>
                </div>
                <div className="stat-item">
                  <i className="fas fa-clock"></i>
                  <span className="stat-label">Last Login</span>
                  <span className="stat-value">{formatDate(profile?.lastLogin)}</span>
                </div>
              </div>
            </div>

            {/* Profile Details Card */}
            <div className="profile-details-card">
              <div className="card-header">
                <h3><i className="fas fa-id-card"></i> Personal Information</h3>
                {!isEditing ? (
                  <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                    <i className="fas fa-pen"></i> Edit Profile
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      firstName: profile?.firstName || '',
                      lastName: profile?.lastName || '',
                      phone: profile?.phone || '',
                      email: profile?.email || ''
                    });
                  }}>
                    <i className="fas fa-times"></i> Cancel
                  </button>
                )}
              </div>

              {error && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="firstName">
                      <i className="fas fa-user"></i> First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">
                      <i className="fas fa-user"></i> Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <i className="fas fa-envelope"></i> Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={true}
                    />
                    <small className="form-hint">Email cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">
                      <i className="fas fa-phone"></i> Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save"></i> Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Security Card */}
            <div className="security-card">
              <div className="card-header">
                <h3><i className="fas fa-shield-halved"></i> Security</h3>
              </div>
              <div className="security-content">
                <div className="security-item">
                  <div className="security-info">
                    <i className="fas fa-key"></i>
                    <div>
                      <h4>Password</h4>
                      <p>Change your password to keep your account secure</p>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm">
                    Change Password
                  </button>
                </div>
                <div className="security-item">
                  <div className="security-info">
                    <i className="fas fa-mobile-screen"></i>
                    <div>
                      <h4>Two-Factor Authentication</h4>
                      <p>Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
