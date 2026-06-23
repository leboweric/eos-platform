import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Clock, X, Loader2 } from 'lucide-react';

const BulkIssueActionsContent = ({
  selectedCount,
  currentTimeline,
  onMove,
  onClear,
  isLoading = false,
  themeColors = { primary: '#3B82F6', secondary: '#1E40AF' },
  variant = 'floating'
}) => {
  const targetTimeline = currentTimeline === 'short_term' ? 'long_term' : 'short_term';
  const moveLabel = targetTimeline === 'long_term' ? 'Move to Long-Term' : 'Move to Short-Term';

  const containerClass = variant === 'inline'
    ? 'mb-4 p-4 bg-white/90 backdrop-blur-sm rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-3'
    : 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-white/50 backdrop-blur-md';

  const containerStyle = variant === 'inline'
    ? {
        borderColor: `${themeColors.primary}40`,
        background: `linear-gradient(135deg, ${themeColors.primary}08 0%, ${themeColors.secondary}08 100%)`
      }
    : {
        background: 'rgba(255, 255, 255, 0.98)',
        boxShadow: `0 8px 32px ${themeColors.primary}30`
      };

  return (
    <div className={containerClass} style={containerStyle}>
      <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
        {selectedCount} issue{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-2">
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

const BulkIssueActionsBar = ({
  selectedCount,
  currentTimeline,
  onMove,
  onClear,
  isLoading = false,
  themeColors = { primary: '#3B82F6', secondary: '#1E40AF' },
  variant = 'floating'
}) => {
  if (selectedCount === 0) return null;

  const content = (
    <BulkIssueActionsContent
      selectedCount={selectedCount}
      currentTimeline={currentTimeline}
      onMove={onMove}
      onClear={onClear}
      isLoading={isLoading}
      themeColors={themeColors}
      variant={variant}
    />
  );

  if (variant === 'inline') {
    return content;
  }

  return createPortal(content, document.body);
};

export default BulkIssueActionsBar;