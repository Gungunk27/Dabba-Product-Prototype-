import React, { useState, useEffect } from 'react';
import { Provider, MealItem } from '../types';
import { TiffinService } from '../services/tiffinService';
import { MealCard } from '../components/MealCard';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { useCart } from '../context/CartContext';
import { ArrowLeft, MapPin, Clock, ShieldCheck, Phone, ChefHat, Info } from 'lucide-react';

interface ProviderDetailsViewProps {
  providerId: string;
}

export const ProviderDetailsView: React.FC<ProviderDetailsViewProps> = ({ providerId }) => {
  const { navigate } = useCart();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProvider() {
      setIsLoading(true);
      setError(null);
      try {
        const [foundProvider, foundMeals] = await Promise.all([
          TiffinService.getProviderById(providerId),
          TiffinService.getProviderMeals(providerId),
        ]);
        if (!foundProvider) {
          setError('Kitchen not found or currently inactive.');
          return;
        }
        setProvider(foundProvider);
        setMeals(foundMeals);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load kitchen details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadProvider();
  }, [providerId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 animate-pulse space-y-6" aria-busy="true" aria-label="Loading kitchen profile">
        <div className="h-4 w-32 bg-stone-200 rounded" />
        <div className="h-56 bg-stone-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <ErrorMessage
          message={error || 'Kitchen not found.'}
          onRetry={() => navigate({ name: 'home' })}
        />
        <button
          onClick={() => navigate({ name: 'home' })}
          className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* 1. Back button */}
      <button
        type="button"
        onClick={() => navigate({ name: 'home' })}
        className="text-xs text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded p-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace Discovery
      </button>

      {/* 2. Kitchen Header Banner */}
      <section aria-label="Kitchen Profile Header" className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="h-48 sm:h-60 w-full relative bg-stone-900">
          <img
            src={provider.bannerUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                  Established {provider.establishedYear} · Neighborhood Kitchen
                </span>
                <span className="text-[10px] font-semibold bg-stone-900/80 text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/30">
                  Demo Kitchen
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {provider.name}
              </h1>
              <p className="text-xs text-stone-300 flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Head Cook: <strong>{provider.leadChef}</strong></span>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-stone-300 shrink-0">
              <span className="font-bold text-white text-sm tabular-nums block">
                {provider.activeSubscribers} Active Dabba Subscribers
              </span>
              <span className="text-[11px] text-stone-400">
                Delivery Coverage: ~{provider.distanceKm} km from {provider.locality}
              </span>
            </div>
          </div>
        </div>

        {/* Locality & Contact Strip */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-stone-50/60 border-t border-stone-200 text-xs">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Locality Hub</span>
              <span className="text-stone-600">{provider.locality}, {provider.city}</span>
              <span className="block text-stone-500 text-[11px]">Radius: {provider.distanceKm} km delivery zone</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Daily Dispatch Windows</span>
              <span className="text-stone-600">Lunch: {provider.deliveryWindows.lunch}</span>
              <span className="block text-stone-600">Dinner: {provider.deliveryWindows.dinner}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Kitchen Helpline</span>
              <span className="text-stone-600">{provider.contactPhone}</span>
              <span className="block text-[11px] text-amber-900 font-medium">{provider.demoLicenseNotice}</span>
            </div>
          </div>
        </div>

        {/* Kitchen Description & Hygiene (Rendered ONLY when supplied) */}
        {(provider.bio || (provider.hygieneStandards && provider.hygieneStandards.length > 0)) && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Description (ONLY when supplied) */}
            {provider.bio && (
              <div className="max-w-3xl">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                  Kitchen Story & Cooking Approach
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {provider.bio}
                </p>
              </div>
            )}

            {/* Hygiene Standards (ONLY when supplied) */}
            {provider.hygieneStandards && provider.hygieneStandards.length > 0 && (
              <div className="pt-4 border-t border-stone-100">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-800" />
                  Kitchen Cleanliness & Hygiene Pledge
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700">
                  {provider.hygieneStandards.map((std, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-amber-700 font-bold">✓</span>
                      <span>{std}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Available Meals offered by this provider */}
      <section aria-label="Available Tiffin Offerings" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              Fresh Tiffins by {provider.name}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Available for lunch and dinner subscriptions in {provider.locality}.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {meals.length} {meals.length === 1 ? 'Offering' : 'Offerings'}
          </span>
        </div>

        {meals.length === 0 ? (
          <EmptyState
            title="No active meals listed"
            description="This kitchen has not published any active meals today. Please explore other neighborhood kitchens."
            actionText="View All Tiffins"
            onAction={() => navigate({ name: 'home' })}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                onSelect={mealId => navigate({ name: 'meal-details', mealId })}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Delivery & Pricing Transparency Notice */}
      <aside aria-label="Delivery and pricing transparency notice" className="p-4 bg-stone-100/80 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Transparent Pricing Notice:</strong> Base prices reflect home-cooked food and reusable stainless container hygiene. Delivery charges are calculated at checkout based on distance from {provider.locality} and are free for weekly or monthly subscribers.
        </p>
      </aside>
    </div>
  );
};
