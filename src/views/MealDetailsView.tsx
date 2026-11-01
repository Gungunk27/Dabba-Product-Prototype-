import React, { useState, useEffect } from 'react';
import { MealItem, Provider, SubscriptionFrequency } from '../types';
import { TiffinService } from '../services/tiffinService';
import { useCart } from '../context/CartContext';
import { PriceDisplay } from '../components/PriceDisplay';
import { ErrorMessage } from '../components/ErrorMessage';
import { MealReviewsSection } from '../components/MealReviewsSection';
import { ArrowLeft, Check, Clock, Calendar, MapPin, Info, ShieldCheck, Star, Bookmark } from 'lucide-react';

interface MealDetailsViewProps {
  mealId: string;
}

export const MealDetailsView: React.FC<MealDetailsViewProps> = ({ mealId }) => {
  const { addToCart, navigate, isFavorite, toggleFavorite } = useCart();
  const [meal, setMeal] = useState<MealItem | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contiguous Purchase Module states
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('single_trial');
  const [slot, setSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [quantity, setQuantity] = useState<number>(1);
  const [instructions, setInstructions] = useState<string>('');
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    async function loadMeal() {
      setIsLoading(true);
      setError(null);
      try {
        const foundMeal = await TiffinService.getMealById(mealId);
        if (!foundMeal) {
          setError('Meal not found or currently unavailable in catalog.');
          return;
        }
        setMeal(foundMeal);
        const foundProvider = await TiffinService.getProviderById(foundMeal.providerId);
        setProvider(foundProvider);
        if (foundMeal.slot === 'dinner') {
          setSlot('dinner');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading meal details from database.');
      } finally {
        setIsLoading(false);
      }
    }
    loadMeal();
  }, [mealId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading meal details">
        <div className="h-4 w-32 bg-stone-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 aspect-[4/3] bg-stone-200 rounded-2xl" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-8 w-3/4 bg-stone-200 rounded" />
            <div className="h-4 w-1/2 bg-stone-100 rounded" />
            <div className="h-32 bg-stone-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorMessage
          message={error || 'Unable to display meal details.'}
          onRetry={() => navigate({ name: 'home' })}
        />
        <button
          onClick={() => navigate({ name: 'home' })}
          className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const daysCount = frequency === 'weekly_6days' ? 6 : frequency === 'monthly_24days' ? 24 : 1;
  const unitRate = frequency === 'weekly_6days' ? meal.weeklyPricePerMeal : frequency === 'monthly_24days' ? meal.monthlyPricePerMeal : meal.pricePerMeal;
  const calculatedTotal = unitRate * daysCount * quantity;

  const handleAddToCart = () => {
    addToCart(meal, frequency, slot, quantity, instructions);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
        <button
          onClick={() => navigate({ name: 'home' })}
          className="hover:text-stone-900 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Discovery
        </button>
        <span aria-hidden="true">/</span>
        <button
          onClick={() => provider && navigate({ name: 'provider-details', providerId: provider.id })}
          className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1"
        >
          {meal.providerName}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-stone-900 font-semibold truncate max-w-xs">{meal.title}</span>
      </nav>

      {/* 2. Main PDP Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visuals, Nutritional Inclusions, Weekly Schedule & Kitchen Story */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative aspect-[4/3] shadow-xs">
            <img
              src={meal.imageUrl}
              alt={`Photograph of ${meal.title}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded shadow-xs ${
                meal.isAvailable ? 'bg-emerald-700 text-white' : 'bg-stone-900 text-white'
              }`}>
                {meal.isAvailable ? 'Available for Ordering' : 'Currently Sold Out'}
              </span>
              <span className="text-xs font-semibold bg-stone-900/80 text-amber-200 px-2 py-1 rounded backdrop-blur-xs">
                Demo Listing
              </span>
            </div>

            {/* Favorite Bookmark Button */}
            <button
              type="button"
              onClick={() => toggleFavorite(meal.id, meal.title)}
              aria-label={isFavorite(meal.id) ? `Remove ${meal.title} from favorites` : `Bookmark ${meal.title} as favorite`}
              aria-pressed={isFavorite(meal.id)}
              className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg backdrop-blur-md transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isFavorite(meal.id)
                  ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 ring-1 ring-amber-400'
                  : 'bg-stone-950/80 text-white/90 hover:bg-stone-950 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFavorite(meal.id) ? 'fill-stone-950 text-stone-950' : 'text-stone-200'}`} />
              <span>{isFavorite(meal.id) ? 'Bookmarked' : 'Bookmark Meal'}</span>
            </button>

            <div className="absolute bottom-3 left-3 bg-stone-950/80 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg">
              {meal.packaging}
            </div>
          </div>

          {/* Description & Contents (Rendered ONLY when supplied) */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">About this Tiffin</h2>
              {meal.description ? (
                <p className="text-sm text-stone-600 leading-relaxed mt-1">
                  {meal.description}
                </p>
              ) : null}
            </div>

            {/* Meal Contents (ONLY when supplied) */}
            {meal.contents && meal.contents.length > 0 && (
              <div className="pt-3 border-t border-stone-100">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2.5">
                  Standard Thali Inclusions ({meal.contents.length} Items)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                  {meal.contents.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition & Lead Time unboxed metadata */}
            <div className="pt-3 border-t border-stone-100 flex items-center gap-4 text-xs text-stone-500 flex-wrap">
              {meal.caloriesEstimate && (
                <>
                  <span>Estimated Calories: <strong className="text-stone-800">{meal.caloriesEstimate}</strong></span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>Spice Level: <strong className="text-stone-800">{meal.spiceLevel}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Kitchen Prep Lead Time: <strong className="text-stone-800">{meal.preparationLeadTime}</strong></span>
            </div>
          </div>

          {/* Weekly Menu Rotation (Mon - Sat) */}
          {meal.schedule && meal.schedule.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Weekly Rotating Menu Schedule
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Prepared daily from scratch with fresh local produce.
                  </p>
                </div>
                <Calendar className="w-4 h-4 text-stone-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider">
                      <th className="py-2 pr-3 font-semibold">Day</th>
                      <th className="py-2 pr-3 font-semibold">Main Sabzi</th>
                      <th className="py-2 pr-3 font-semibold">Dal / Gravy</th>
                      <th className="py-2 pr-3 font-semibold">Breads & Rice</th>
                      <th className="py-2 font-semibold">Specialty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {meal.schedule.map(row => (
                      <tr key={row.day} className="hover:bg-stone-50">
                        <td className="py-2.5 pr-3 font-bold text-stone-900">{row.day}</td>
                        <td className="py-2.5 pr-3 font-medium text-amber-900">{row.sabziPrimary}</td>
                        <td className="py-2.5 pr-3 text-stone-600">{row.dal}</td>
                        <td className="py-2.5 pr-3 text-stone-600">{row.bread} · {row.rice}</td>
                        <td className="py-2.5 text-stone-500 italic">{row.sweetOrSpecial || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Provider Story (Rendered ONLY when provider & bio are supplied) */}
          {provider && provider.bio && (
            <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    About {provider.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Lead Chef: {provider.leadChef} · {provider.locality}, {provider.city}
                  </p>
                </div>
                <button
                  onClick={() => navigate({ name: 'provider-details', providerId: provider.id })}
                  className="text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                >
                  View Kitchen Profile
                </button>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {provider.bio}
              </p>
            </div>
          )}

          {/* Customer Reviews & Feedback Component */}
          <MealReviewsSection meal={meal} />
        </div>

        {/* Right Column: Contiguous Purchase Module (PDP) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1 flex-wrap">
                <span className="font-semibold text-amber-900 capitalize">
                  {meal.dietType.replace('_', ' ')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{meal.cuisine.replace('_', ' ')}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  {meal.locality}
                </span>
              </div>

              <h1 className="text-xl font-bold text-stone-900 leading-tight">
                {meal.title}
              </h1>

              <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                <p className="text-xs text-stone-500">
                  Prepared by{' '}
                  <button
                    onClick={() => provider && navigate({ name: 'provider-details', providerId: provider.id })}
                    className="text-stone-900 font-semibold underline underline-offset-2 hover:text-amber-800"
                  >
                    {meal.providerName}
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('reviews-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Verified Reviews</span>
                </button>
              </div>
            </div>

            {/* Base Price Display */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100">
              <PriceDisplay
                pricePerMeal={meal.pricePerMeal}
                monthlyPricePerMeal={meal.monthlyPricePerMeal}
                size="lg"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Zero surge pricing · Reusable stainless dabba included
              </p>
            </div>

            {/* Plan Frequency Selector */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
                Choose Plan Frequency
              </legend>
              <div className="grid grid-cols-1 gap-2">
                {/* Single Meal Trial */}
                <button
                  type="button"
                  onClick={() => setFrequency('single_trial')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    frequency === 'single_trial'
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Single Trial Dabba</span>
                    <span className="text-[11px] text-stone-500">1 day · Great for first taste check</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900 tabular-nums">
                    ₹{meal.pricePerMeal.toLocaleString('en-IN')}
                  </span>
                </button>

                {/* Weekly 6-Day Plan */}
                <button
                  type="button"
                  onClick={() => setFrequency('weekly_6days')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    frequency === 'weekly_6days'
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900 block">Weekly 6-Day Plan</span>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 font-semibold px-1 rounded">
                        Save 14%
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500">Mon–Sat (₹{meal.weeklyPricePerMeal.toLocaleString('en-IN')}/meal)</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900 tabular-nums">
                    ₹{(meal.weeklyPricePerMeal * 6).toLocaleString('en-IN')}
                  </span>
                </button>

                {/* Monthly 24-Day Plan */}
                <button
                  type="button"
                  onClick={() => setFrequency('monthly_24days')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    frequency === 'monthly_24days'
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900 block">Monthly 24-Day Plan</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-semibold px-1 rounded">
                        Best Value
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500">24 delivery days (₹{meal.monthlyPricePerMeal.toLocaleString('en-IN')}/meal)</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900 tabular-nums">
                    ₹{(meal.monthlyPricePerMeal * 24).toLocaleString('en-IN')}
                  </span>
                </button>
              </div>
            </fieldset>

            {/* Delivery Slot Picker */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
                Delivery Window
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={meal.slot === 'dinner'}
                  onClick={() => setSlot('lunch')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition-all text-center focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    slot === 'lunch'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  } ${meal.slot === 'dinner' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Lunch (12–1 PM)
                </button>
                <button
                  type="button"
                  disabled={meal.slot === 'lunch'}
                  onClick={() => setSlot('dinner')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition-all text-center focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    slot === 'dinner'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  } ${meal.slot === 'lunch' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Dinner (8–9 PM)
                </button>
              </div>
            </fieldset>

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between pt-1">
              <label htmlFor="quantity-display" className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Daily Dabbas
              </label>
              <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 text-sm font-bold focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  -
                </button>
                <span id="quantity-display" className="px-4 py-1 text-xs font-bold text-stone-900 tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 text-sm font-bold focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  +
                </button>
              </div>
            </div>

            {/* Special Dietary Notes (Optional) */}
            <div className="space-y-1">
              <label htmlFor="special-notes" className="text-xs font-medium text-stone-600 block">
                Dietary notes for chef (Optional)
              </label>
              <input
                id="special-notes"
                type="text"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Less spicy, extra cucumber salad, no chili"
                className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Transparent Itemized Price Breakdown */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2 text-xs">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                Price Breakdown
              </h4>
              <div className="flex justify-between text-stone-600">
                <span>
                  Meal rate (₹{unitRate.toLocaleString('en-IN')} × {daysCount} days × {quantity} box)
                </span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  ₹{calculatedTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Stainless Dabba Deposit</span>
                <span className="font-semibold text-stone-900 tabular-nums">₹30</span>
              </div>
              <div className="flex justify-between text-stone-600 border-t border-stone-200/60 pt-1.5">
                <span>Delivery Charge</span>
                <span className="text-stone-700 font-medium">
                  {frequency !== 'single_trial' || calculatedTotal >= 200 ? (
                    <strong className="text-emerald-700 font-bold">FREE (Included for plan)</strong>
                  ) : (
                    'Calculated at checkout (₹0 – ₹25)'
                  )}
                </span>
              </div>
              <p className="text-[10px] text-stone-500 italic pt-0.5">
                * Delivery charge depends on your delivery address locality. It is not bundled silently into the base meal price.
              </p>
            </div>

            {/* Total calculation & Add to cart CTA */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-stone-500">Meal Plan Subtotal:</span>
                <span className="text-xl font-extrabold text-stone-900 tabular-nums">
                  ₹{calculatedTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!meal.isAvailable}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : meal.isAvailable
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Added to Dabba Bag
                  </>
                ) : (
                  'Add to Dabba Bag'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  addToCart(meal, frequency, slot, quantity, instructions);
                  navigate({ name: 'checkout' });
                }}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-stone-700 border border-stone-300 hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
