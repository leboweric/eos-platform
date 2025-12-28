import { useState } from 'react';
import { DatePicker } from './DatePicker';
import { Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';

/**
 * InlineEditableDatePicker - Inline date picker with auto-save
 * 
 * Features:
 * - Click to open date picker
 * - Auto-saves on date selection
 * - Shows loading and success states
 * - Compact inline display
 * 
 * @param {string} value - Current date value (YYYY-MM-DD format)
 * @param {function} onChange - Async function to save the date
 * @param {string} placeholder - Placeholder text when no date
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable editing
 * @param {function} formatDisplay - Optional custom display format function
 */
export function InlineEditableDatePicker({
  value,
  onChange,
  placeholder = 'Set date',
  className = '',
  disabled = false,
  formatDisplay = null
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = async (newDate) => {
    if (newDate === value) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    setIsOpen(false);

    try {
      await onChange(newDate);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Date change failed:', err);
      // Reopen picker on error so user can try again
      setIsOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = () => {
    if (!value) return placeholder;
    
    if (formatDisplay) {
      return formatDisplay(value);
    }
    
    try {
      const date = new Date(value + 'T00:00:00');
      return format(date, 'MMM d');
    } catch (e) {
      return value;
    }
  };

  if (disabled) {
    return (
      <span className={`inline-editable-date-disabled ${className}`}>
        {displayValue()}
      </span>
    );
  }

  return (
    <div className="inline-editable-date-container inline-flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => !isSaving && setIsOpen(!isOpen)}
          disabled={isSaving}
          className={`inline-editable-date-button ${className} ${!value ? 'text-gray-400' : ''}`}
          title="Click to change date"
        >
          {displayValue()}
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50">
            <DatePicker
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
            />
          </div>
        )}
      </div>
      
      {isSaving && (
        <Loader2 className="animate-spin text-blue-500" size={14} />
      )}
      
      {showSuccess && (
        <Check size={14} className="text-green-500 animate-pulse" />
      )}
    </div>
  );
}
