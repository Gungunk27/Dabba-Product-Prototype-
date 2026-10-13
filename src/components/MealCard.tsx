import React, { useState } from 'react';
import { MealItem } from '../types';
import { PriceDisplay } from './PriceDisplay';
import { useCart } from '../context/CartContext';
import { Utensils, Check, MapPin, Clock, ArrowRight } from 'lucide-react';

interface MealCardProps {
  meal: MealItem;
  onSelect: (mealId: string) => void;
}

export const MealCard: React.FC<MealCardProps> = ({ meal, onSelect }) => {
  const { addToCart, navigate } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(meal, 'single_trial', meal.slot === 'dinner' ? 'dinner' : 'lunch');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleProviderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({ name: 'provider-details', providerId: meal.providerId });
  };

  const dietLabels: Record<string, string> = {
    pure_veg: 'Pure Vegetarian',
    jain: '100% Jain Sattvic',
    homestyle: 'Homestyle Light',
    egg_curry: 'Egg & Veg',
    low_oil: 'Low Oil Homestyle',
  };

  return (
    <article
      tabIndex={0}
      role="button"
      aria-label={`View details for ${meal.title} from ${meal.providerName}`}
      onClick={() => onSelect(meal.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(meal.id);
        }
      }}
      className="group flex flex-col bg-white rounded-xl border border-stone-200/90 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      {/* 1. Leading Imagery with measured scrim and availability badge */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <img
          src={meal.imageUrl}
          alt={`Photograph of ${meal.title}`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Quiet unboxed gradient scrim for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          {/* Availability Status */}
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded shadow-xs ${
              meal.isAvailable
                ? 'bg-emerald-600/90 text-white'
                : 'bg-stone-900/90 text-white'
            }`}
          >
            {meal.isAvailable ? 'Available Today' : 'Sold Out Today'}
          </span>

          {/* Explicit Demo Label */}
          <span className="text-[10px] font-semibold bg-stone-900/80 text-amber-200 px-1.5 py-0.5 rounded backdrop-blur-xs">
            Demo Listing
          </span>
        </div>

        {/* Bottom image overlay details */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <button
            type="button"
            onClick={handleProviderClick}
            className="text-xs font-semibold text-stone-100 hover:text-amber-300 hover:underline transition-colors truncate block text-left"
            title={`View ${meal.providerName} profile`}
          >
            {meal.providerName}
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-300 mt-0.5">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{meal.locality}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{meal.slot === 'both' ? 'Lunch & Dinner' : `${meal.slot} slot`}</span>
          </div>
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Unboxed Metadata Line (No static pills) */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1.5 flex-wrap">
            <span className="font-semibold text-amber-900">{dietLabels[meal.dietType] || 'Homestyle'}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{meal.cuisine.replace('_', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span>{meal.packaging}</span>
          </div>

          {/* Meal Title */}
          <h3 className="text-base font-bold text-stone-900 line-clamp-1 group-hover:text-amber-800 transition-colors">
            {meal.title}
          </h3>

          {/* Tagline / Contents preview (rendered only when provided) */}
          {meal.tagline && (
            <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
              {meal.tagline}
            </p>
          )}
        </div>

        {/* Meal contents preview (only when supplied) */}
        {meal.contents && meal.contents.length > 0 && (
          <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">
              {meal.contents.slice(0, 3).join(' · ')}
            </span>
          </div>
        )}

        {/* Price & Action Module */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <PriceDisplay
                pricePerMeal={meal.pricePerMeal}
                monthlyPricePerMeal={meal.monthlyPricePerMeal}
                size="sm"
                showSavingsBadge={false}
              />
              <p className="text-[10px] text-stone-500">
                + delivery charge (distance calculated at checkout)
              </p>
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!meal.isAvailable}
              aria-label={`Quick add ${meal.title} to dabba bag`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                justAdded
                  ? 'bg-emerald-600 text-white'
                  : meal.isAvailable
                  ? 'bg-stone-900 text-white hover:bg-amber-800'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added
                </>
              ) : (
                'Quick Add'
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
