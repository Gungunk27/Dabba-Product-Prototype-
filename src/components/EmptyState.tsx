import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No tiffin meals found',
  description = 'Try adjusting your search criteria, selecting a different dietary preference, or clearing filters.',
  actionText = 'Reset Filters',
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-stone-200 my-6">
      <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center mb-4">
        <UtensilsCrossed className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-stone-900 mb-1">{title}</h3>
      <p className="text-sm text-stone-500 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
