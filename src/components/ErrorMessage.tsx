import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 my-4 text-rose-900"
    >
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-bold text-rose-900">{title}</h4>
        <p className="text-xs text-rose-700 mt-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-900 text-white rounded-md hover:bg-rose-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
      </div>
    </div>
  );
};
