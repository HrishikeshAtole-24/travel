import ComingSoon from '../components/ComingSoon/ComingSoon';

export const metadata = { title: 'Wishlist · SkyWings' };

export default function WishlistPage() {
  return (
    <ComingSoon
      icon="heart"
      eyebrow="Wishlist"
      title="Save stays and routes for later"
      text="Soon you’ll be able to heart any hotel or route and come back to it from your account. Until then, your bookings live in My trips."
      points={[
        { icon: 'heart', title: 'Save with one tap', text: 'Heart a hotel or route from search results.' },
        { icon: 'tag', title: 'Price changes', text: 'See when a saved fare or room rate moves.' },
        { icon: 'users', title: 'Plan together', text: 'Share a shortlist with the people you travel with.' }
      ]}
    />
  );
}
