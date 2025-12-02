import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * FormattedText - Renders text with support for bullet points and newlines
 *
 * Features:
 * - Automatically formats lines starting with -, *, or • as bullet points
 * - Preserves line breaks
 * - Optional expand/collapse for long content
 *
 * @param {string} text - The text content to display
 * @param {number} maxLines - Maximum lines to show before truncating (default: 3)
 * @param {boolean} expandable - Whether to show expand/collapse button (default: true)
 * @param {string} className - Additional CSS classes for the container
 */
export const FormattedText = ({
  text,
  maxLines = 3,
  expandable = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const lines = text.split('\n');
  const shouldTruncate = !isExpanded && lines.length > maxLines;
  const displayLines = shouldTruncate ? lines.slice(0, maxLines) : lines;
  const isLongContent = lines.length > maxLines || text.length > 150;

  const renderLine = (line, index) => {
    const trimmedLine = line.trim();

    // Check if line is a bullet point (starts with -, *, or •)
    const bulletMatch = trimmedLine.match(/^[-*•]\s*(.*)$/);

    if (bulletMatch) {
      return (
        <div key={index} className="flex items-start gap-2 ml-2">
          <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span>
          <span>{bulletMatch[1]}</span>
        </div>
      );
    }

    // Regular line
    if (trimmedLine) {
      return <div key={index}>{trimmedLine}</div>;
    }

    // Empty line (preserve spacing)
    return <div key={index} className="h-2" />;
  };

  return (
    <div className={className}>
      <div className="space-y-1">
        {displayLines.map((line, index) => renderLine(line, index))}
        {shouldTruncate && (
          <span className="text-slate-400">...</span>
        )}
      </div>

      {/* Expand/Collapse button */}
      {expandable && isLongContent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default FormattedText;
