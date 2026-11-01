import React, { useState, useEffect, useMemo } from 'react';
import { CustomerReview, CreateReviewInput, MealItem } from '../types';
import { TiffinService } from '../services/tiffinService';
import { Star, ThumbsUp, MessageSquare, Check, Sparkles, Filter, AlertCircle, ChefHat, Heart } from 'lucide-react';

interface MealReviewsSectionProps {
  meal: MealItem;
  onReviewAdded?: (updatedReview: CustomerReview) => void;
}

const ASPECT_OPTIONS = [
  'Piping Hot Phulkas',
  'Authentic Spices',
  'Light on Stomach',
  'Generous Portion',
  'Eco-friendly Dabba',
  'Right On Time',
  'Zero Excess Oil',
  'Fresh Daily Sabzi',
];

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Below Average',
  3: 'Decent Homestyle',
  4: 'Delicious & Fresh',
  5: 'Outstanding Homestyle Taste',
};

export const MealReviewsSection: React.FC<MealReviewsSectionProps> = ({ meal, onReviewAdded }) => {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [planType, setPlanType] = useState<string>('weekly_6days');
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [recommended, setRecommended] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter & Sort states
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [aspectFilter, setAspectFilter] = useState<string | 'all'>('all');

  // Load reviews on mount or meal change
  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      setIsLoading(true);
      setError(null);
      try {
        const fetched = await TiffinService.getMealReviews(meal.id);
        if (isMounted) {
          setReviews(fetched);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load meal reviews.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [meal.id]);

  // Aggregate stats calculations
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        recommendationRate: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      };
    }

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = Number((sum / total).toFixed(1));

    const recCount = reviews.filter(r => r.recommended !== false).length;
    const recRate = Math.round((recCount / total) * 100);

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      dist[star] = (dist[star] || 0) + 1;
    });

    const percs: Record<number, number> = {
      5: Math.round(((dist[5] || 0) / total) * 100),
      4: Math.round(((dist[4] || 0) / total) * 100),
      3: Math.round(((dist[3] || 0) / total) * 100),
      2: Math.round(((dist[2] || 0) / total) * 100),
      1: Math.round(((dist[1] || 0) / total) * 100),
    };

    return {
      averageRating: avg,
      totalReviews: total,
      recommendationRate: recRate,
      distribution: dist,
      percentages: percs,
    };
  }, [reviews]);

  // Filtered & Sorted reviews
  const filteredReviews = useMemo(() => {
    return reviews
      .filter(r => {
        if (selectedStarFilter !== 'all' && r.rating !== selectedStarFilter) {
          return false;
        }
        if (aspectFilter !== 'all' && (!r.aspects || !r.aspects.includes(aspectFilter))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') return b.rating - a.rating;
        if (sortBy === 'lowest') return a.rating - b.rating;
        if (sortBy === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0);
        // Default: recent
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [reviews, selectedStarFilter, aspectFilter, sortBy]);

  const toggleAspect = (aspect: string) => {
    setSelectedAspects(prev =>
      prev.includes(aspect) ? prev.filter(a => a !== aspect) : [...prev, aspect]
    );
  };

  const handleHelpfulClick = async (reviewId: string) => {
    try {
      const result = await TiffinService.voteReviewHelpful(reviewId);
      setReviews(prev =>
        prev.map(r => (r.id === reviewId ? { ...r, helpfulCount: result.helpfulCount } : r))
      );
    } catch {
      // ignore
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!rating || rating < 1 || rating > 5) {
      setFormError('Please choose a star rating (1 to 5).');
      return;
    }

    if (!authorName.trim() || authorName.trim().length < 2) {
      setFormError('Please enter your name (at least 2 characters).');
      return;
    }

    if (!reviewText.trim() || reviewText.trim().length < 10) {
      setFormError('Please share a few details about your meal (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateReviewInput = {
        mealId: meal.id,
        providerId: meal.providerId,
        authorName: authorName.trim(),
        rating,
        reviewText: reviewText.trim(),
        dietTag: meal.dietType,
        aspects: selectedAspects,
        planType,
        recommended,
      };

      const created = await TiffinService.submitReview(input);

      // Prepend to current list optimistically
      setReviews(prev => [created, ...prev]);

      // Reset form
      setAuthorName('');
      setReviewText('');
      setSelectedAspects([]);
      setRating(5);
      setIsFormOpen(false);
      setSuccessToast('Thank you! Your verified review has been published.');
      setTimeout(() => setSuccessToast(null), 6000);

      if (onReviewAdded) {
        onReviewAdded(created);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to publish review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reviews-section" aria-label="Customer Reviews and Ratings" className="space-y-6 pt-6 border-t border-stone-200">
      {/* 1. Header with Title & Action CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Customer Reviews & Experience</span>
            {stats.totalReviews > 0 && (
              <span className="text-xs font-normal text-stone-500">
                ({stats.totalReviews} verified {stats.totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real feedback from subscribers receiving daily dabbas from {meal.providerName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            setFormError(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-xs ${
            isFormOpen
              ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
              : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {isFormOpen ? 'Close Form' : 'Write a Review'}
        </button>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-fadeIn"
        >
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Interactive "Write a Review" Form Module */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitReview}
          className="p-6 bg-amber-50/40 rounded-2xl border border-amber-200/80 shadow-xs space-y-5 animate-fadeIn"
          aria-label="Submit your tiffin experience review"
        >
          <div className="border-b border-amber-200/60 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Share Feedback on {meal.title}
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Help fellow customers and {meal.providerName} maintain exceptional quality.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
              Verified Tiffin Review
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
              Overall Rating <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
                role="radiogroup"
                aria-label="Rating from 1 to 5 stars"
              >
                {[1, 2, 3, 4, 5].map(starValue => {
                  const isFilled = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      role="radio"
                      aria-checked={rating === starValue}
                      aria-label={`${starValue} star: ${RATING_LABELS[starValue]}`}
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      className="p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          isFilled
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-amber-950">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Author Name & Plan Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="review-author" className="text-xs font-bold text-stone-900 block">
                Your Name <span className="text-red-600">*</span>
              </label>
              <input
                id="review-author"
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                required
                className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="review-plan" className="text-xs font-bold text-stone-900 block">
                Your Tiffin Plan Experience
              </label>
              <select
                id="review-plan"
                value={planType}
                onChange={e => setPlanType(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="single_trial">Single Trial Dabba</option>
                <option value="weekly_6days">Weekly 6-Day Subscription</option>
                <option value="monthly_24days">Monthly 24-Day Subscription</option>
              </select>
            </div>
          </div>

          {/* Experience Highlights / Aspects */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-900 block">
              What did you appreciate most? (Select highlights)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ASPECT_OPTIONS.map(aspect => {
                const isSelected = selectedAspects.includes(aspect);
                return (
                  <button
                    key={aspect}
                    type="button"
                    onClick={() => toggleAspect(aspect)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-600'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{aspect}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="review-text" className="text-xs font-bold text-stone-900 block">
                Detailed Feedback <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] text-stone-400">
                {reviewText.length} characters (min 10)
              </span>
            </div>
            <textarea
              id="review-text"
              rows={3}
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="How was the roti tenderness, spice balance, dal consistency, and temperature upon arrival?"
              required
              className="w-full text-xs p-3 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* Recommendation Checkbox & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-700">
              <input
                type="checkbox"
                checked={recommended}
                onChange={e => setRecommended(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
              />
              <span className="flex items-center gap-1 font-medium">
                <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                I recommend this daily dabba to neighbors and colleagues
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Verified Review'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. Aggregate Rating Breakdown Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left score highlight */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-stone-100 pb-5 md:pb-0 md:pr-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight tabular-nums">
                {stats.averageRating > 0 ? stats.averageRating : '—'}
              </span>
              <span className="text-sm font-semibold text-stone-400">/ 5.0</span>
            </div>

            {/* Stars row */}
            <div className="flex items-center gap-1" aria-label={`Average rating: ${stats.averageRating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map(starIdx => {
                const isFull = stats.averageRating >= starIdx;
                const isHalf = stats.averageRating >= starIdx - 0.5 && !isFull;
                return (
                  <Star
                    key={starIdx}
                    className={`w-4 h-4 ${
                      isFull
                        ? 'text-amber-500 fill-amber-500'
                        : isHalf
                        ? 'text-amber-500 fill-amber-500/50'
                        : 'text-stone-200 fill-stone-100'
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-xs text-stone-600">
              Based on <strong className="text-stone-900 font-bold">{stats.totalReviews}</strong> customer {stats.totalReviews === 1 ? 'rating' : 'ratings'}
            </p>

            {stats.totalReviews > 0 && (
              <p className="text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded">
                ✓ {stats.recommendationRate}% of customers recommend this dabba
              </p>
            )}
          </div>

          {/* Middle: Rating distribution bars */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map(starNum => {
              const count = stats.distribution[starNum] || 0;
              const percentage = stats.percentages[starNum] || 0;
              const isSelected = selectedStarFilter === starNum;

              return (
                <button
                  key={starNum}
                  type="button"
                  onClick={() =>
                    setSelectedStarFilter(selectedStarFilter === starNum ? 'all' : starNum)
                  }
                  className={`w-full flex items-center gap-3 text-xs group hover:bg-stone-50 p-1.5 rounded-lg transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isSelected ? 'bg-amber-50/80 ring-1 ring-amber-300' : ''
                  }`}
                  title={`Filter by ${starNum} star reviews (${count} reviews)`}
                >
                  <span className="w-12 font-semibold text-stone-700 shrink-0 flex items-center gap-1">
                    <span>{starNum}</span>
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </span>

                  {/* Progress bar track */}
                  <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        starNum >= 4 ? 'bg-amber-500' : starNum === 3 ? 'bg-amber-300' : 'bg-stone-300'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-10 text-right text-stone-500 tabular-nums shrink-0 text-[11px]">
                    {count} ({percentage}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quiet, unboxed satisfaction pillars (Zero-pill discipline) */}
        <div className="mt-6 pt-5 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-stone-600">
          <div>
            <span className="text-[11px] text-stone-400 block">Taste & Seasoning</span>
            <strong className="text-stone-900 font-bold">98% Satisfied</strong>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 block">Portion Quantity</span>
            <strong className="text-stone-900 font-bold">96% Adequate</strong>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 block">Dabba Temperature</span>
            <strong className="text-stone-900 font-bold">95% Warm on Arrival</strong>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 block">Dispatch Punctuality</span>
            <strong className="text-stone-900 font-bold">97% In Window</strong>
          </div>
        </div>
      </div>

      {/* 4. Filter & Sorting Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Star Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-stone-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedStarFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              selectedStarFilter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Stars ({reviews.length})
          </button>
          {[5, 4, 3].map(s => {
            const count = reviews.filter(r => r.rating === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStarFilter(selectedStarFilter === s ? 'all' : s)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  selectedStarFilter === s
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>{s}★</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label htmlFor="reviews-sort" className="text-stone-500">
            Sort by:
          </label>
          <select
            id="reviews-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="p-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* 5. Reviews List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading reviews">
          <div className="h-28 bg-stone-100 rounded-xl" />
          <div className="h-28 bg-stone-100 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-4 bg-stone-100 text-stone-600 rounded-xl text-xs text-center">
          {error}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-3">
          <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
          <h4 className="text-sm font-bold text-stone-900">
            {selectedStarFilter !== 'all' ? `No ${selectedStarFilter}-star reviews found` : 'No reviews published yet'}
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {selectedStarFilter !== 'all'
              ? 'Try selecting "All Stars" to view all customer ratings for this tiffin.'
              : `Be the very first subscriber to share your honest homestyle experience with ${meal.providerName}!`}
          </p>
          {selectedStarFilter !== 'all' ? (
            <button
              onClick={() => setSelectedStarFilter('all')}
              className="text-xs font-semibold text-amber-900 underline underline-offset-2"
            >
              Reset filters
            </button>
          ) : (
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors"
            >
              Write First Review
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map(review => {
            const planLabel =
              review.planType === 'weekly_6days'
                ? 'Weekly 6-Day Plan'
                : review.planType === 'monthly_24days'
                ? 'Monthly 24-Day Plan'
                : 'Single Trial Dabba';

            // Author initials
            const initials = review.authorName
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <article
                key={review.id}
                className="p-5 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-3 transition-colors hover:border-stone-300"
              >
                {/* Author row & Meta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar initial badge */}
                    <div
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200"
                    >
                      {initials || 'C'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-stone-900">
                          {review.authorName}
                        </span>
                        {review.verifiedSubscriber !== false && (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Verified Subscriber
                          </span>
                        )}
                      </div>

                      {/* Unboxed Metadata (Zero-pill discipline) */}
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5 flex-wrap">
                        <span>{planLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{review.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars & Numeric Value */}
                  <div className="flex items-center gap-1.5 shrink-0" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(starNum => (
                        <Star
                          key={starNum}
                          className={`w-3.5 h-3.5 ${
                            starNum <= review.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-200 fill-stone-100'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-stone-900 tabular-nums">
                      {review.rating}.0
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs text-stone-700 leading-relaxed">
                  {review.reviewText}
                </p>

                {/* Selected Aspects / Highlight Tags */}
                {review.aspects && review.aspects.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {review.aspects.map((aspect, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded"
                      >
                        ✓ {aspect}
                      </span>
                    ))}
                  </div>
                )}

                {/* Kitchen Chef Response Card (if present) */}
                {review.kitchenReply && (
                  <div className="mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
                      <span className="flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-amber-700" />
                        Response from {review.kitchenReply.chefName} ({meal.providerName})
                      </span>
                      <span className="text-stone-400 font-normal">
                        {review.kitchenReply.repliedAt}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      {review.kitchenReply.replyText}
                    </p>
                  </div>
                )}

                {/* Helpful Upvote Button */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-[11px] text-stone-400">
                    Was this review helpful to your order decision?
                  </span>

                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(review.id)}
                    aria-label={`Mark review by ${review.authorName} as helpful. Current votes: ${review.helpfulCount || 0}`}
                    className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors px-2 py-1 rounded hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <ThumbsUp className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                    <span>Helpful ({review.helpfulCount || 0})</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
