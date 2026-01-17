'use client';

import { useRouter } from 'next/navigation';
import '../list-property/coming-soon.css';

export default function WishlistPage() {
  const router = useRouter();

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          <i className="fas fa-heart"></i>
        </div>
        <h1>Wishlist</h1>
        <p className="coming-soon-subtitle">Save your favourite destinations</p>
        <p className="coming-soon-description">
          Create and manage your travel wishlist. Save flights, hotels, and destinations 
          you love and book them when you're ready!
        </p>
        <div className="coming-soon-features">
          <div className="feature-item">
            <i className="fas fa-bookmark"></i>
            <span>Save unlimited favorites</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-bell"></i>
            <span>Price drop alerts</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-share-alt"></i>
            <span>Share with friends</span>
          </div>
        </div>
        <button className="btn-back" onClick={() => router.push('/')}>
          <i className="fas fa-arrow-left"></i>
          Back to Home
        </button>
      </div>
    </div>
  );
}
