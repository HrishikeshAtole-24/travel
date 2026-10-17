import ComingSoon from '../components/ComingSoon/ComingSoon';

export const metadata = { title: 'List your property · SkyWings' };

export default function ListPropertyPage() {
  return (
    <ComingSoon
      icon="building"
      eyebrow="For hotels"
      title="List your property on SkyWings"
      text="We currently sell rooms through supplier partners. Direct listings for hotels, resorts and homestays are on the way — tell us about your property and we’ll reach out when onboarding opens."
      points={[
        { icon: 'hotel', title: 'Direct listings', text: 'Manage rooms, rates and availability yourself.' },
        { icon: 'shield-check', title: 'Secure payouts', text: 'Payments collected through Razorpay.' },
        { icon: 'headset', title: 'Partner support', text: 'A named contact for every property.' }
      ]}
    />
  );
}
