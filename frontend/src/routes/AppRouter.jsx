// src/routes/AppRouter.jsx
// Single source of truth for all frontend routes.
// Pages are lazy-loaded so each phase only loads what the user visits.

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Spinner from '../components/ui/Spinner/Spinner';
import MainMenu from '../components/layout/MainMenu/MainMenu';
import Footer from '../components/layout/Footer/Footer';
import { PageErrorBoundary } from '../components/ui/ErrorBoundary/ErrorBoundary';

// ---------------------------------------------------------------------------
// Lazy imports — one per page
// ---------------------------------------------------------------------------

// Phase 2 — Auth
const Login            = lazy(() => import('../pages/Auth/Login'));
const Register         = lazy(() => import('../pages/Auth/Register'));
const VerifyEmail      = lazy(() => import('../pages/Auth/VerifyEmail'));
const ForgotPassword   = lazy(() => import('../pages/Auth/ForgotPassword'));
const ResetPassword    = lazy(() => import('../pages/Auth/ResetPassword'));

// Phase 1 placeholder home
const Home             = lazy(() => import('../pages/Home/Home'));

// Phase 3 — Resources
const ResourceLibrary  = lazy(() => import('../pages/Resources/ResourceLibrary'));
const ResourceDetail   = lazy(() => import('../pages/Resources/ResourceDetail'));

// Phase 4 — Subscriptions
const PricingPage      = lazy(() => import('../pages/Subscriptions/PricingPage'));
const MySubscription   = lazy(() => import('../pages/Subscriptions/MySubscription'));
const PaymentSuccess   = lazy(() => import('../pages/Subscriptions/PaymentSuccess'));

// Phase 5 — Products + Cart + Orders
const ProductListing   = lazy(() => import('../pages/Products/ProductListing'));
const ProductDetail    = lazy(() => import('../pages/Products/ProductDetail'));
const CartPage         = lazy(() => import('../pages/Cart/CartPage'));
const CheckoutPage     = lazy(() => import('../pages/Checkout/CheckoutPage'));
const OrderHistory     = lazy(() => import('../pages/Orders/OrderHistory'));
const OrderDetail      = lazy(() => import('../pages/Orders/OrderDetail'));

// Phase 7 — Blog
const BlogListing      = lazy(() => import('../pages/Blog/BlogListing'));
const BlogPost         = lazy(() => import('../pages/Blog/BlogPost'));

// Phase 8 — Search
const SearchResults    = lazy(() => import('../pages/Search/SearchResults'));

// Phase 9 — Dashboard
const ProfilePage      = lazy(() => import('../pages/Dashboard/ProfilePage'));
const SavedResources   = lazy(() => import('../pages/Dashboard/SavedResources'));
const AddressBook      = lazy(() => import('../pages/Dashboard/AddressBook'));

// ---------------------------------------------------------------------------
// Nav items — passed as data to MainMenu so it stays stateless
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    slug:  'resources',
    type:  'megamenu',
    label: 'Resources',
    megamenuTitle: 'Browse Resources',
    megamenuContent: [
      { href: '/resources',                  label: 'All Resources'    },
      { href: '/resources?resource_type=worksheet', label: 'Worksheets' },
      { href: '/resources?resource_type=lesson_plan', label: 'Lesson Plans' },
      { href: '/resources?access_level=free', label: 'Free Resources'  },
    ],
  },
  {
    slug:  'products',
    type:  'link',
    label: 'Shop',
    href:  '/products',
  },
  {
    slug:  'blog',
    type:  'link',
    label: 'Blog',
    href:  '/blog',
  },
  {
    slug:  'pricing',
    type:  'link',
    label: 'Pricing',
    href:  '/pricing',
  },
  {
    slug: 'search-mega',
    type: 'search',
    label: 'Search',
  },
  {
    slug: 'cart-mega',
    type: 'cart',
    label: 'Cart',
  },
];

// ---------------------------------------------------------------------------
// Fallback shown while a lazy page is loading
// ---------------------------------------------------------------------------
function PageFallback() {
  return (
    <div style={{ paddingTop: 'var(--nav-height)' }}>
      <Spinner fullPage message="Loading…" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default function AppRouter() {
  return (
    <>
      <MainMenu items={NAV_ITEMS} />

      <main className="page-content" id="main-content" tabIndex={-1}>
        <PageErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ---- Public ---- */}
            <Route path="/"               element={<Home />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/register"       element={<Register />} />
            <Route path="/verify-email/:uidb64/:token" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />

            {/* ---- Resources (detail visible to all; download gated) ---- */}
            <Route path="/resources"         element={<ResourceLibrary />} />
            <Route path="/resources/:id"     element={<ResourceDetail />} />

            {/* ---- Products ---- */}
            <Route path="/products"          element={<ProductListing />} />
            <Route path="/products/:slug"    element={<ProductDetail />} />

            {/* ---- Cart (public — guest cart supported) ---- */}
            <Route path="/cart"              element={<CartPage />} />

            {/* ---- Blog ---- */}
            <Route path="/blog"              element={<BlogListing />} />
            <Route path="/blog/:slug"        element={<BlogPost />} />

            {/* ---- Search ---- */}
            <Route path="/search"            element={<SearchResults />} />

            {/* ---- Pricing (public) ---- */}
            <Route path="/pricing"           element={<PricingPage />} />

            {/* ---- Payment callback (public — Paystack redirects here) ---- */}
            <Route path="/payment-success"   element={<PaymentSuccess />} />

            {/* ---- Protected ---- */}
            <Route path="/checkout" element={
              <ProtectedRoute><CheckoutPage /></ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute><OrderHistory /></ProtectedRoute>
            } />
            <Route path="/orders/:orderNumber" element={
              <ProtectedRoute><OrderDetail /></ProtectedRoute>
            } />
            <Route path="/subscriptions" element={
              <ProtectedRoute><MySubscription /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/profile/saved" element={
              <ProtectedRoute><SavedResources /></ProtectedRoute>
            } />
            <Route path="/profile/addresses" element={
              <ProtectedRoute><AddressBook /></ProtectedRoute>
            } />

            {/* ---- Fallback ---- */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </PageErrorBoundary>
      </main>

      <Footer />
    </>
  );
}
