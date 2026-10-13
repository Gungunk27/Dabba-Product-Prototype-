import React from 'react';
import { useCart } from '../context/CartContext';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate } = useCart();

  return (
    <footer className="mt-20 border-t border-stone-200 bg-white">
      {/* Notice Banner */}
      <div className="bg-amber-50/70 border-b border-amber-100/80 py-3 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Demo Marketplace Preview:</strong> All kitchen listings, prices, menus and order confirmations are realistic demonstration data. No real payment gateways or actual deliveries are triggered.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 space-y-3">
            <span className="text-lg font-bold text-stone-900 flex items-center gap-1.5">
              <span className="text-amber-600">●</span> TiffinTrack
            </span>
            <p className="text-xs text-stone-600 max-w-sm leading-relaxed">
              Connecting urban professionals, students, and elders with genuine homestyle tiffin services. Healthy everyday rotis, dals, and regional thalis cooked with low oil and family care.
            </p>
            <div className="text-xs text-stone-500 pt-1">
              Bengaluru Local Hubs: Indiranagar · Koramangala · HSR Layout · Jayanagar
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-stone-600">
              <li>
                <button
                  onClick={() => navigate({ name: 'home' })}
                  className="hover:text-stone-900 transition-colors"
                >
                  All Daily Tiffins
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate({ name: 'home' })}
                  className="hover:text-stone-900 transition-colors"
                >
                  Pure Veg & Jain Plans
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate({ name: 'home' })}
                  className="hover:text-stone-900 transition-colors"
                >
                  Student Budget Dabbas
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate({ name: 'provider-dashboard' })}
                  className="hover:text-stone-900 transition-colors"
                >
                  Home Kitchen Dashboard
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
              Hygiene & Dabba Care
            </h4>
            <ul className="space-y-2 text-xs text-stone-600">
              <li>Insulated Stainless Steel Dabbas</li>
              <li>FSSAI Registered Home Cooks</li>
              <li>Daily RO Water Kitchens</li>
              <li>Zero Chemical Preservatives</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} TiffinTrack Technologies. Built for healthy everyday eating.</p>
          <div className="flex items-center gap-1 text-stone-400">
            <span>Freshly packed with care</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
