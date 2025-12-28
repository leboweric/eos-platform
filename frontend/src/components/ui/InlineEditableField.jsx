import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Check, X } from 'lucide-react';

/**
 * InlineEditableField - A reusable component for inline editing
 * 
 * Features:
 * - Click to edit
 * - Auto-save on blur
 * - Enter to save, Esc to cancel
 * - Loading and success states
 * - Error handling
 * 
 * @param {string} value - Current value
 * @param {function} onSave - Async function to save the value
 * @param {string} type - Input type (text, email, etc.)
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable editing
 * @param {function} validate - Optional validation function
 */
export function InlineEditableField({ 
  value, 
  onSave, 
  type = 'text',
  placeholder = 'Click to edit',
  className = '',
  disabled = false,
  validate = null,
  multiline = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Update editValue when value prop changes
  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const ref = multiline ? textareaRef : inputRef;
      if (ref.current) {
        ref.current.focus();
        ref.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = async () => {
    // No change, just exit edit mode
    if (editValue === value) {
      setIsEditing(false);
      setError(null);
      return;
    }

    // Validate if validator provided
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Don't allow empty values
    if (!editValue.trim()) {
      setError('This field cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue.trim());
      setIsEditing(false);
      setShowSuccess(true);
      
      // Hide success indicator after 1.5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      // Ctrl+Enter to save in multiline mode
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Don't auto-save if there's an error
    if (error) return;
    
    // Auto-save on blur
    handleSave();
  };

  if (disabled) {
    return (
      <span className={`inline-editable-disabled ${className}`}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="inline-editable-container">
        {multiline ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={`inline-editable-textarea ${className} ${error ? 'border-red-500' : ''}`}
            placeholder={placeholder}
            rows={3}
          />
        ) : (
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={`inline-editable-input ${className} ${error ? 'border-red-500' : ''}`}
            placeholder={placeholder}
          />
        )}
        
        {isSaving && (
          <Loader2 className="inline-editable-icon animate-spin text-blue-500" size={16} />
        )}
        
        {error && (
          <div className="inline-editable-error">
            <X size={14} className="inline mr-1" />
            {error}
          </div>
        )}
        
        {!isSaving && !error && (
          <div className="inline-editable-hint text-xs text-gray-500 mt-1">
            {multiline ? 'Ctrl+Enter to save, Esc to cancel' : 'Enter to save, Esc to cancel'}
          </div>
        )}
      </div>
    );
  }

  return (
    <span 
      onClick={() => !disabled && setIsEditing(true)}
      className={`inline-editable-text ${className} ${!disabled ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 -mx-1' : ''}`}
      title={!disabled ? 'Click to edit' : ''}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
      {showSuccess && (
        <Check size={16} className="inline ml-2 text-green-500 animate-pulse" />
      )}
    </span>
  );
}

/**
 * InlineEditableSelect - Inline editable dropdown
 * 
 * @param {string|number} value - Current value
 * @param {function} onChange - Function to handle change
 * @param {array} options - Array of {value, label} options
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable editing
 */
export function InlineEditableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
  renderValue = null
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = async (e) => {
    const newValue = e.target.value;
    
    if (newValue === value) return;

    setIsSaving(true);

    try {
      await onChange(newValue);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Change failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (disabled) {
    const selectedOption = options.find(opt => opt.value === value);
    return (
      <span className={`inline-editable-disabled ${className}`}>
        {renderValue ? renderValue(value) : (selectedOption?.label || placeholder)}
      </span>
    );
  }

  return (
    <div className="inline-editable-select-container inline-flex items-center gap-2">
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={isSaving}
        className={`inline-editable-select ${className} cursor-pointer`}
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {isSaving && (
        <Loader2 className="animate-spin text-blue-500" size={16} />
      )}
      
      {showSuccess && (
        <Check size={16} className="text-green-500 animate-pulse" />
      )}
    </div>
  );
}
