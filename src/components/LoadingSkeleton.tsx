import React from 'react';

export const MealCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] w-full bg-stone-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-1/3 bg-stone-200 rounded" />
        <div className="h-5 w-3/4 bg-stone-200 rounded" />
        <div className="h-3 w-full bg-stone-100 rounded" />
        <div className="h-3 w-2/3 bg-stone-100 rounded" />
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="h-6 w-20 bg-stone-200 rounded" />
          <div className="h-7 w-20 bg-stone-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const GridLoadingSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MealCardSkeleton key={i} />
      ))}
    </div>
  );
};
