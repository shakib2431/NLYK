import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import '@/App.css';
import { StoreProvider, useStore } from '@/context/StoreContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SearchOverlay from '@/components/SearchOverlay';
import WelcomePopup from '@/components/WelcomePopup';
import Home from '@/pages/Home';
import ListingPage from '@/pages/ListingPage';
import Collections from '@/pages/Collections';
import CollectionDetail from '@/pages/CollectionDetail';
import ProductDetail from '@/pages/ProductDetail';
import Wishlist from '@/pages/Wishlist';
import CartPage from '@/pages/CartPage';
import SearchPage from '@/pages/SearchPage';
import TrackOrder from '@/pages/TrackOrder';
import Admin from '@/pages/Admin';
import Account from '@/pages/Account';
import NotFound from '@/pages/NotFound';
import Membership from '@/pages/Membership';
import Club from '@/pages/Club';
import ClubDrops from '@/pages/ClubDrops';
import FoundingCard from '@/pages/FoundingCard';
import CustomDesign from '@/pages/CustomDesign';
import { About, Contact, SizeGuide, Shipping, Returns, FaqPage } from '@/pages/InfoPages';

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const { cartOpen, searchOpen } = useStore();
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <ScrollManager />
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-arrivals" element={<ListingPage key="new-arrivals" listingKey="new-arrivals" />} />
          <Route path="/men" element={<ListingPage key="men" listingKey="men" />} />
          <Route path="/women" element={<ListingPage key="women" listingKey="women" />} />
          <Route path="/tees" element={<ListingPage key="tees" listingKey="tees" />} />
          <Route path="/shirts" element={<ListingPage key="shirts" listingKey="shirts" />} />
          <Route path="/hoodies" element={<ListingPage key="hoodies" listingKey="hoodies" />} />
          <Route path="/bottoms" element={<ListingPage key="bottoms" listingKey="bottoms" />} />
          <Route path="/accessories" element={<ListingPage key="accessories" listingKey="accessories" />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:slug" element={<CollectionDetail />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/track/:orderId" element={<TrackOrder />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/membership/founding" element={<FoundingCard />} />
          <Route path="/club" element={<Club />} />
          <Route path="/club/drops" element={<ClubDrops />} />
          <Route path="/custom-design" element={<CustomDesign />} />
          <Route path="/account" element={<Account />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/size-guide" element={<SizeGuide />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
      <AnimatePresence>
        {cartOpen && <CartDrawer key="cart-drawer" />}
        {searchOpen && <SearchOverlay key="search-overlay" />}
      </AnimatePresence>
      <WelcomePopup />
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 0, background: '#0A0A0A', color: '#F7F7F5', border: '1px solid #0A0A0A' } }} />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.09 });
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <BrowserRouter>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </BrowserRouter>
  );
}
