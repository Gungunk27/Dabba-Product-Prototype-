import React from 'react';

interface PriceDisplayProps {
  pricePerMeal: number;
  monthlyPricePerMeal?: number;
  size?: 'sm' | 'md' | 'lg';
  showSavingsBadge?: boolean;
  showDeliveryNotice?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  pricePerMeal,
  monthlyPricePerMeal,
  size = 'md',
  showSavingsBadge = true,
  showDeliveryNotice = false,
}) => {
  const savingsPercent = monthlyPricePerMeal
    ? Math.round(((pricePerMeal - monthlyPricePerMeal) / pricePerMeal) * 100)
    : 0;

  const sizeClasses = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-extrabold',
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-stone-900 tabular-nums ${sizeClasses[size]}`}>
          ₹{pricePerMeal.toLocaleString('en-IN')}
          <span className="text-xs font-normal text-stone-500"> / meal</span>
        </span>

        {monthlyPricePerMeal && monthlyPricePerMeal < pricePerMeal && (
          <span className="text-xs text-stone-500 tabular-nums">
            (₹{monthlyPricePerMeal.toLocaleString('en-IN')}/meal monthly)
          </span>
        )}

        {showSavingsBadge && savingsPercent > 0 && (
          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
            Save {savingsPercent}%
          </span>
        )}
      </div>

      {showDeliveryNotice && (
        <p className="text-[11px] text-stone-500">
          + delivery fee (calculated at checkout based on locality)
        </p>
      )}
    </div>
  );
};
