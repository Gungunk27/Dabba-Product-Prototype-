/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { MealDetailsView } from './views/MealDetailsView';
import { ProviderDetailsView } from './views/ProviderDetailsView';
import { CheckoutView } from './views/CheckoutView';
import { OrderConfirmationView } from './views/OrderConfirmationView';
import { ProviderDashboardView } from './views/ProviderDashboardView';
import { FavoritesView } from './views/FavoritesView';
import { OrderHistoryView } from './views/OrderHistoryView';
import { DatabaseStatusBanner } from './components/DatabaseStatusBanner';
import { CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentRoute, toastMessage } = useCart();

  const renderCurrentView = () => {
    switch (currentRoute.name) {
      case 'home':
        return <HomeView />;
      case 'favorites':
        return <FavoritesView />;
      case 'order-history':
        return <OrderHistoryView />;
      case 'meal-details':
        return <MealDetailsView mealId={currentRoute.mealId} />;
      case 'provider-details':
        return <ProviderDetailsView providerId={currentRoute.providerId} />;
      case 'checkout':
        return <CheckoutView />;
      case 'order-confirmation':
        return <OrderConfirmationView orderId={currentRoute.orderId} />;
      case 'provider-dashboard':
        return <ProviderDashboardView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Explicit Database Mode & Diagnostics Banner */}
      <DatabaseStatusBanner />

      {/* 3-Zone Top Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>

      {/* Footer */}
      <Footer />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-stone-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
