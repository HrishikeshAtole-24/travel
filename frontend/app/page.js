import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import PopularDestinations from './components/PopularDestinations/PopularDestinations';
import TrendingStays from './components/TrendingStays/TrendingStays';
import WhyChooseUs from './components/WhyChooseUs/WhyChooseUs';
import FAQ from './components/FAQ/FAQ';
import Footer from './components/Footer/Footer';
import './page.css';

// Figma "Home · Desktop" / "Home · Mobile"
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <PopularDestinations />
        <TrendingStays />
        <WhyChooseUs />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
