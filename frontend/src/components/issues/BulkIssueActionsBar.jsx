import { Button } from '@/components/ui/button';
import { Clock, X, Loader2 } from 'lucide-react';

const BulkIssueActionsBar = ({
  selectedCount,
  currentTimeline,
  onMove,
  onClear,
  isLoading = false,
  themeColors = { primary: '#3B82F6', secondary: '#1E40AF' }
}) => {
  if (selectedCount === 0) return null;

  const targetTimeline = currentTimeline === 'short_term' ? 'long_term' : 'short_term';
  const moveLabel = targetTimeline === 'long_term' ? 'Move to Long-Term' : 'Move to Short-Term';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-white/50 backdrop-blur-md"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: `0 8px 32px ${themeColors.primary}25`
        }}
      >
        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
          {selectedCount} issue{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="w-px h-6 bg-slate-200" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={isLoading}
          className="h-8 px-3 text-slate-600 hover:text-slate-900"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>

        <Button
          size="sm"
          onClick={() => onMove(targetTimeline)}
          disabled={isLoading}
          className="h-8 px-4 text-white shadow-md hover:shadow-lg transition-all"
          style={{
            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Clock className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Moving...' : moveLabel}
        </Button>
      </div>
    </div>
  );
};

export default BulkIssueActionsBar;