import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './dialog';
import { Button } from './button';
import { 
  Trash2, 
  Archive, 
  AlertTriangle, 
  ArrowRightLeft, 
  CheckSquare,
  XCircle
} from 'lucide-react';

const CONFIRMATION_TYPES = {
  delete: {
    icon: Trash2,
    iconColor: 'text-red-600',
    titleColor: 'text-red-600',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    defaultTitle: 'Delete Item',
    defaultActionLabel: 'Delete'
  },
  archive: {
    icon: Archive,
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-600',
    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    defaultTitle: 'Archive Item',
    defaultActionLabel: 'Archive'
  },
  convert: {
    icon: ArrowRightLeft,
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-600',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    defaultTitle: 'Convert Item',
    defaultActionLabel: 'Convert'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-600',
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    defaultTitle: 'Warning',
    defaultActionLabel: 'Proceed'
  },
  confirm: {
    icon: CheckSquare,
    iconColor: 'text-green-600',
    titleColor: 'text-green-600',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
    defaultTitle: 'Confirm Action',
    defaultActionLabel: 'Confirm'
  },
  remove: {
    icon: XCircle,
    iconColor: 'text-red-600',
    titleColor: 'text-red-600',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    defaultTitle: 'Remove Item',
    defaultActionLabel: 'Remove'
  }
};

/**
 * Reusable confirmation dialog component for standardizing all confirmations
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onOpenChange - Function to handle open state changes
 * @param {function} onConfirm - Function called when user confirms action
 * @param {function} onCancel - Optional function called when user cancels (defaults to onOpenChange(false))
 * @param {string} type - Type of confirmation: 'delete', 'archive', 'convert', 'warning', 'confirm', 'remove'
 * @param {string} title - Custom title (overrides default)
 * @param {string|React.Node} message - Main confirmation message
 * @param {string} actionLabel - Custom action button label (overrides default)
 * @param {string} cancelLabel - Custom cancel button label (defaults to 'Cancel')
 * @param {boolean} loading - Whether the action is in progress
 * @param {string} className - Additional CSS classes for DialogContent
 * @param {string} themeColor - Custom theme color to override default colors
 */
const ConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  type = 'confirm',
  title,
  message,
  actionLabel,
  cancelLabel = 'Cancel',
  loading = false,
  className = '',
  themeColor
}) => {
  const config = CONFIRMATION_TYPES[type] || CONFIRMATION_TYPES.confirm;
  const Icon = config.icon;
  
  // Use theme color if provided, otherwise fall back to default colors
  const titleColorClass = themeColor ? '' : config.titleColor;
  const titleStyle = themeColor ? { color: themeColor } : {};
  const buttonStyle = themeColor ? { 
    backgroundColor: themeColor, 
    borderColor: themeColor,
    color: 'white'
  } : {};
  const buttonClass = themeColor ? 'hover:opacity-90 text-white' : config.buttonClass;
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[425px] ${className}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${titleColorClass}`} style={titleStyle}>
            <Icon className="h-5 w-5" style={titleStyle} />
            {title || config.defaultTitle}
          </DialogTitle>
          {message && (
            <DialogDescription className="pt-2">
              {typeof message === 'string' ? (
                <p className="text-sm text-gray-700">{message}</p>
              ) : (
                message
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            className={buttonClass}
            style={buttonStyle}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="mr-2 h-4 w-4" />
                {actionLabel || config.defaultActionLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;

// Hook for managing confirmation dialog state
export const useConfirmationDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const showConfirmation = (options) => {
    setConfig(options);
    setIsOpen(true);
  };

  const hideConfirmation = () => {
    setIsOpen(false);
    setLoading(false);
    setConfig({});
  };

  const handleConfirm = async () => {
    if (config.onConfirm) {
      console.log('🎯 ConfirmationDialog handleConfirm started');
      setLoading(true);
      try {
        console.log('⏳ Calling config.onConfirm...');
        await config.onConfirm();
        console.log('✅ config.onConfirm resolved, calling hideConfirmation');
        hideConfirmation();
        console.log('🎯 ConfirmationDialog handleConfirm completed - modal should be closed');
      } catch (error) {
        console.log('❌ config.onConfirm threw error:', error);
        setLoading(false);
        // Let the parent component handle the error
        throw error;
      }
    }
  };

  return {
    isOpen,
    setIsOpen,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    loading,
    config,
    ConfirmationDialog: (props) => (
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onConfirm={handleConfirm}
        loading={loading}
        {...config}
        {...props}
      />
    )
  };
};