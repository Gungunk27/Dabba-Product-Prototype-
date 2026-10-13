import React from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentRoute, navigate, totalCartCount } = useCart();

  const handleNavClick = (e: React.MouseEvent, routeName: 'home' | 'provider-dashboard') => {
    e.preventDefault();
    if (routeName === 'home') {
      navigate({ name: 'home' });
    } else if (routeName === 'provider-dashboard') {
      navigate({ name: 'provider-dashboard' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="/"
            onClick={e => handleNavClick(e, 'home')}
            className="text-xl font-extrabold tracking-tight text-stone-900 hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span className="text-amber-600">●</span>
            <span>TiffinTrack</span>
          </a>

          {/* Zone 2: 4-5 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <button
              onClick={e => handleNavClick(e, 'home')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
                currentRoute.name === 'home' ? 'text-stone-950 font-semibold' : ''
              }`}
            >
              Explore Meals
            </button>
            <button
              onClick={() => {
                navigate({ name: 'home' });
                setTimeout(() => {
                  document.getElementById('daily-plans-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </button>
            <button
              onClick={() => {
                navigate({ name: 'home' });
                setTimeout(() => {
                  document.getElementById('kitchens-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0"
            >
              Home Kitchens
            </button>
            <button
              onClick={e => handleNavClick(e, 'provider-dashboard')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
                currentRoute.name === 'provider-dashboard' ? 'text-amber-800 font-semibold' : ''
              }`}
            >
              Kitchen Portal
            </button>
          </nav>

          {/* Zone 3: 1 primary action (Cart & Checkout) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate({ name: 'checkout' })}
              className="relative inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
              aria-label="View Dabba Cart"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Dabba Bag</span>
              {totalCartCount > 0 && (
                <span className="ml-1 bg-amber-500 text-stone-950 text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
