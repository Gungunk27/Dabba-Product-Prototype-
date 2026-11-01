import React from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Bookmark, Package } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentRoute, navigate, totalCartCount, totalFavoritesCount } = useCart();

  const handleNavClick = (e: React.MouseEvent, routeName: 'home' | 'provider-dashboard' | 'order-history') => {
    e.preventDefault();
    if (routeName === 'home') {
      navigate({ name: 'home' });
    } else if (routeName === 'provider-dashboard') {
      navigate({ name: 'provider-dashboard' });
    } else if (routeName === 'order-history') {
      navigate({ name: 'order-history' });
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
              onClick={e => handleNavClick(e, 'order-history')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                currentRoute.name === 'order-history' ? 'text-amber-800 font-semibold' : ''
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>My Orders</span>
            </button>
            <button
              onClick={e => handleNavClick(e, 'provider-dashboard')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
                currentRoute.name === 'provider-dashboard' ? 'text-amber-800 font-semibold' : ''
              }`}
            >
              Kitchen Portal
            </button>
            <button
              onClick={() => navigate({ name: 'favorites' })}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                currentRoute.name === 'favorites' ? 'text-amber-800 font-semibold' : ''
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${totalFavoritesCount > 0 ? 'fill-amber-500 text-amber-600' : ''}`} />
              <span>Favorites</span>
              {totalFavoritesCount > 0 && (
                <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                  ({totalFavoritesCount})
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Actions (Orders, Favorites & Cart) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick My Orders Button */}
            <button
              onClick={() => navigate({ name: 'order-history' })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                currentRoute.name === 'order-history'
                  ? 'border-amber-400 bg-amber-50 text-amber-900'
                  : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50'
              }`}
              aria-label="View Order History & Tracking"
              title="My Orders & Dabba Tracking"
            >
              <Package className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Orders</span>
            </button>

            {/* Quick Favorites Button */}
            <button
              onClick={() => navigate({ name: 'favorites' })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                currentRoute.name === 'favorites'
                  ? 'border-amber-400 bg-amber-50 text-amber-900'
                  : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50'
              }`}
              aria-label={`View ${totalFavoritesCount} bookmarked favorite meals`}
              title="Saved Favorite Meals"
            >
              <Bookmark className={`w-3.5 h-3.5 ${totalFavoritesCount > 0 ? 'fill-amber-500 text-amber-600' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">Favorites</span>
              {totalFavoritesCount > 0 && (
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
                  {totalFavoritesCount}
                </span>
              )}
            </button>

            {/* Dabba Cart Button */}
            <button
              onClick={() => navigate({ name: 'checkout' })}
              className="relative inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
