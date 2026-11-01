import React, { useState, useEffect } from 'react';
import { MealItem } from '../types';
import { TiffinService } from '../services/tiffinService';
import { useCart } from '../context/CartContext';
import { MealCard } from '../components/MealCard';
import { GridLoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Bookmark, ArrowLeft, Trash2, Sparkles, ChefHat } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const { navigate, favoriteMealIds, removeFavorite } = useCart();
  const [favoriteMeals, setFavoriteMeals] = useState<MealItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFavoriteMeals() {
      setIsLoading(true);
      try {
        const { meals } = await TiffinService.getMeals();
        if (isMounted) {
          const matched = meals.filter(m => favoriteMealIds.includes(m.id));
          setFavoriteMeals(matched);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadFavoriteMeals();
    return () => {
      isMounted = false;
    };
  }, [favoriteMealIds]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500">
        <button
          onClick={() => navigate({ name: 'home' })}
          className="hover:text-stone-900 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace Discovery
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-stone-900 font-semibold">Favorite Meals</span>
      </nav>

      {/* 2. Header Banner */}
      <header className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                <Bookmark className="w-4 h-4 fill-amber-500 text-amber-600" />
              </span>
              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                Quick Access Bookmarks
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Your Favorite Tiffin Meals
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
              Your personally saved daily dabbas. Reorder in a single click, check today&apos;s kitchen schedule, or switch subscription plans effortlessly.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tabular-nums">
              {favoriteMeals.length}
            </span>
            <span className="block text-xs text-stone-500">
              {favoriteMeals.length === 1 ? 'Bookmarked Meal' : 'Bookmarked Meals'}
            </span>
          </div>
        </div>
      </header>

      {/* 3. Catalog Content */}
      {isLoading ? (
        <GridLoadingSkeleton count={3} />
      ) : favoriteMeals.length === 0 ? (
        <EmptyState
          title="No favorite meals saved yet"
          description="Click the bookmark icon on any meal card or meal details page to save your go-to tiffins here for instant access."
          actionText="Browse Today's Tiffins"
          onAction={() => navigate({ name: 'home' })}
        />
      ) : (
        <section aria-label="Bookmarked Meals List" className="space-y-6">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              Showing {favoriteMeals.length} {favoriteMeals.length === 1 ? 'saved meal' : 'saved meals'}
            </span>
            <button
              type="button"
              onClick={() => navigate({ name: 'home' })}
              className="text-stone-900 font-semibold hover:text-amber-800 transition-colors underline underline-offset-2"
            >
              Explore more meals
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteMeals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                onSelect={mealId => navigate({ name: 'meal-details', mealId })}
              />
            ))}
          </div>

          {/* Helpful Reorder Notice */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-950 flex items-start gap-2.5">
            <ChefHat className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Daily Menu Sync:</strong> Even for saved favorite meals, daily sabzis and specials rotate fresh every morning from Monday to Saturday according to each kitchen&apos;s weekly schedule.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
