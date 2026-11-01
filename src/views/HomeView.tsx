import React, { useState, useEffect } from 'react';
import { MealItem, Provider, FilterState } from '../types';
import { TiffinService } from '../services/tiffinService';
import { MealCard } from '../components/MealCard';
import { FilterBar } from '../components/FilterBar';
import { GridLoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { useCart } from '../context/CartContext';
import { ArrowRight, Clock, ShieldCheck, Sparkles, ChefHat, MapPin } from 'lucide-react';

export const HomeView: React.FC = () => {
  const { navigate, favoriteMealIds } = useCart();
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    dietType: 'all',
    cuisine: 'all',
    slot: 'all',
    locality: 'all',
    maxPrice: 200,
    sortBy: 'featured',
    favoritesOnly: false,
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mealsResult, providersResult] = await Promise.all([
        TiffinService.getMeals(filters),
        TiffinService.getProviders(),
      ]);
      setMeals(mealsResult.meals);
      setProviders(providersResult.providers);
      setIsDemoMode(mealsResult.isDemoMode || providersResult.isDemoMode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  return (
    <div className="space-y-12">
      {/* 1. Hero Showcase Section */}
      <section className="relative overflow-hidden rounded-2xl bg-stone-900 text-white shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[440px]">
          {/* Left Text Column */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between z-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <ChefHat className="w-4 h-4" />
                <span>Wholesome Daily Homestyle Cooking</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
                Comforting home-cooked dabbas for your everyday routine.
              </h1>

              <p className="text-sm sm:text-base text-stone-300 max-w-xl leading-relaxed">
                Skip oily restaurant takeouts. TiffinTrack connects you with vetted home kitchens delivering warm, nutritious rotis, wholesome dals, and seasonal subzis in insulated dabbas by 12:30 PM.
              </p>
            </div>

            {/* Quick Filter Jump & Proof Strip */}
            <div className="pt-6 sm:pt-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const el = document.getElementById('explore-catalog');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>Browse Today&apos;s Tiffins</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, dietType: 'jain' }));
                    const el = document.getElementById('explore-catalog');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-3 bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold rounded-lg transition-colors border border-stone-700/80"
                >
                  Jain Sattvic Plans
                </button>
              </div>

              {/* Adjacency Proof Row */}
              <div className="pt-2 flex items-center gap-4 text-xs text-stone-400 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Insulated Stainless Dabbas
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> Hot Lunch by 12:30 PM
                </span>
                <span aria-hidden="true">·</span>
                <span>Trial Plans From ₹85/meal</span>
              </div>
            </div>
          </div>

          {/* Right Image Column */}
          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full">
            <img
              src="/src/assets/images/tiffin_hero_thali_1791881640666.jpg"
              alt="Homestyle Indian Thali Spread"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-stone-900 via-stone-900/30 to-transparent" />
            <div className="absolute bottom-4 right-4 bg-stone-950/80 backdrop-blur-xs text-stone-200 text-xs px-3 py-1.5 rounded-md border border-stone-800">
              Fresh Daily Menu Rotations
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Marketplace Catalog Area */}
      <section id="explore-catalog" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Today&apos;s Fresh Tiffin Offerings
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Cooked fresh in small kitchen batches with low salt and premium oils.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        {(() => {
          const displayedMeals = filters.favoritesOnly
            ? meals.filter(m => favoriteMealIds.includes(m.id))
            : meals;

          return (
            <>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                totalResults={displayedMeals.length}
              />

              {/* Catalog Grid or States */}
              {isLoading ? (
                <GridLoadingSkeleton count={4} />
              ) : error ? (
                <ErrorMessage message={error} onRetry={loadData} />
              ) : displayedMeals.length === 0 ? (
                filters.favoritesOnly ? (
                  <EmptyState
                    title="No bookmarked favorite meals found"
                    description="You haven't bookmarked any meals matching this search or locality yet. Click the bookmark icon on any meal card to add it to your favorites."
                    actionText="Show All Tiffins"
                    onAction={() => setFilters(prev => ({ ...prev, favoritesOnly: false }))}
                  />
                ) : (
                  <EmptyState
                    title="No meals match your current selection"
                    description="No meals found matching your search or filters. Try selecting 'All Localities', increasing the maximum price, or switching between lunch and dinner slots."
                    actionText="Clear All Filters"
                    onAction={() =>
                      setFilters({
                        searchQuery: '',
                        dietType: 'all',
                        cuisine: 'all',
                        slot: 'all',
                        locality: 'all',
                        maxPrice: 200,
                        sortBy: 'featured',
                        favoritesOnly: false,
                      })
                    }
                  />
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayedMeals.map(meal => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onSelect={mealId => navigate({ name: 'meal-details', mealId })}
                    />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* 3. How TiffinTrack Works (Strict Claim-to-Proof & Content Ceiling) */}
      <section id="daily-plans-section" className="bg-stone-100/70 border border-stone-200 rounded-2xl p-8 sm:p-10">
        <div className="max-w-2xl mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            How Everyday Dabba Delivery Works
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Zero hassle. No daily ordering stress. Just warm wholesome food waiting for you every single day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-stone-200/80 space-y-2">
            <span className="text-xs font-bold text-amber-800">Step 01</span>
            <h3 className="text-base font-bold text-stone-900">Pick Meal & Plan</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Order a single trial meal to taste the cooking, or start a weekly (6-day) or monthly (24-day) subscription for steep discounts.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200/80 space-y-2">
            <span className="text-xs font-bold text-amber-800">Step 02</span>
            <h3 className="text-base font-bold text-stone-900">Cooked Fresh Daily</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Our verified home chefs start preparation 90 minutes before delivery time using pure RO water, fresh local greens, and minimal oil.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200/80 space-y-2">
            <span className="text-xs font-bold text-amber-800">Step 03</span>
            <h3 className="text-base font-bold text-stone-900">Doorstep Exchange</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Receive your steaming hot dabba by 12:30 PM. For daily subscribers, our delivery executive simply picks up yesterday&apos;s empty dabba.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Home Kitchens Spotlight */}
      <section id="kitchens-section" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Featured Neighborhood Kitchens
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Family-run tiffin services serving residential blocks and office hubs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {providers.map(prov => (
            <article
              key={prov.id}
              tabIndex={0}
              role="button"
              aria-label={`View kitchen profile for ${prov.name} in ${prov.locality}`}
              onClick={() => navigate({ name: 'provider-details', providerId: prov.id })}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate({ name: 'provider-details', providerId: prov.id });
                }
              }}
              className="group bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={prov.avatarUrl}
                    alt=""
                    aria-hidden="true"
                    className="w-12 h-12 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                        {prov.name}
                      </h3>
                    </div>
                    <p className="text-xs text-stone-500">Chef {prov.leadChef}</p>
                  </div>
                </div>

                {/* Show provider description ONLY when supplied */}
                {prov.bio && (
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {prov.bio}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  {prov.locality}
                </span>
                <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded">
                  Demo Kitchen
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
