import React from 'react';
import { FilterState, MealDietType } from '../types';
import { Search, RotateCcw, MapPin, IndianRupee, Bookmark } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface FilterBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, totalResults }) => {
  const { totalFavoritesCount } = useCart();
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const handleDietClick = (diet: 'all' | MealDietType) => {
    onChange({ ...filters, dietType: diet });
  };

  const handleSlotClick = (slot: 'all' | 'lunch' | 'dinner') => {
    onChange({ ...filters, slot });
  };

  const handleLocalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, locality: e.target.value });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, maxPrice: Number(e.target.value) });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] });
  };

  const handleReset = () => {
    onChange({
      searchQuery: '',
      dietType: 'all',
      cuisine: 'all',
      slot: 'all',
      locality: 'all',
      maxPrice: 200,
      sortBy: 'featured',
      favoritesOnly: false,
    });
  };

  const isFiltered =
    filters.searchQuery !== '' ||
    filters.dietType !== 'all' ||
    filters.slot !== 'all' ||
    filters.locality !== 'all' ||
    filters.maxPrice < 200 ||
    filters.sortBy !== 'featured' ||
    Boolean(filters.favoritesOnly);

  const dietOptions: { id: 'all' | MealDietType; label: string }[] = [
    { id: 'all', label: 'All Diets' },
    { id: 'pure_veg', label: 'Pure Veg' },
    { id: 'jain', label: 'Jain Sattvic' },
    { id: 'homestyle', label: 'Light Homestyle' },
  ];

  const slotOptions: { id: 'all' | 'lunch' | 'dinner'; label: string }[] = [
    { id: 'all', label: 'All Slots' },
    { id: 'lunch', label: 'Lunch (12–1 PM)' },
    { id: 'dinner', label: 'Dinner (8–9 PM)' },
  ];

  const localityOptions = [
    { id: 'all', label: 'All Localities' },
    { id: 'Indiranagar', label: 'Indiranagar' },
    { id: 'Koramangala', label: 'Koramangala' },
    { id: 'Jayanagar', label: 'Jayanagar' },
    { id: 'HSR Layout', label: 'HSR Layout' },
  ];

  return (
    <section aria-label="Meal Search & Discovery Filters" className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-4">
      {/* Row 1: Search bar by meal or provider name */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <label htmlFor="search-input" className="sr-only">
            Search by meal or provider name
          </label>
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-input"
            type="search"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by meal name (e.g. North Thali, Phulka) or provider (e.g. Annapurna)..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort-select" className="text-xs font-medium text-stone-600 whitespace-nowrap">
            Sort:
          </label>
          <select
            id="sort-select"
            value={filters.sortBy}
            onChange={handleSortChange}
            className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <option value="featured">Featured Curated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Locality & Maximum Price Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
        {/* Locality Selector */}
        <div>
          <label htmlFor="locality-select" className="text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-stone-400" /> Locality Hub
          </label>
          <select
            id="locality-select"
            value={filters.locality}
            onChange={handleLocalityChange}
            className="w-full py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {localityOptions.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max Price Selector */}
        <div>
          <label htmlFor="max-price-select" className="text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
            <IndianRupee className="w-3 h-3 text-stone-400" /> Max Meal Price
          </label>
          <select
            id="max-price-select"
            value={filters.maxPrice}
            onChange={handleMaxPriceChange}
            className="w-full py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <option value={200}>Any Price (Up to ₹200)</option>
            <option value={120}>Under ₹120 / meal</option>
            <option value={105}>Under ₹105 / meal</option>
            <option value={95}>Budget: Under ₹95 / meal</option>
          </select>
        </div>

        {/* Lunch / Dinner Slot Controls */}
        <div className="sm:col-span-2">
          <span className="text-xs font-semibold text-stone-600 mb-1 block">
            Delivery Slot
          </span>
          <div className="flex items-center p-1 bg-stone-100 rounded-lg">
            {slotOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSlotClick(opt.id)}
                className={`flex-1 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors text-center focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  filters.slot === opt.id
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Diet Segmented Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-stone-100 pb-1">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-1 shrink-0">
          Diet:
        </span>
        <div className="flex items-center p-1 bg-stone-100 rounded-lg shrink-0">
          {dietOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleDietClick(opt.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 ${
                filters.dietType === opt.id
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Bookmarked / Favorites Quick Filter Toggle */}
        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
            aria-pressed={Boolean(filters.favoritesOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              filters.favoritesOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-semibold'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${filters.favoritesOnly ? 'fill-white text-white' : 'text-amber-600'}`} />
            <span>Saved Favorites</span>
            {totalFavoritesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums font-bold ${
                  filters.favoritesOnly ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {totalFavoritesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Results tally */}
      <div className="text-xs text-stone-500 flex items-center justify-between pt-1 border-t border-stone-100">
        <span>
          Showing <strong className="text-stone-800 font-semibold">{totalResults}</strong> affordable daily tiffin options
        </span>
        <span className="text-stone-400 hidden sm:inline">
          Delivery charges calculated transparently at checkout
        </span>
      </div>
    </section>
  );
};
