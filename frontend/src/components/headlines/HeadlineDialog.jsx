import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Megaphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getOrgTheme } from '../../utils/themeUtils';
import { useAuthStore } from '../../stores/authStore';

const HeadlineDialog = ({ open, onOpenChange, onSave }) => {
  const { user } = useAuthStore();
  const orgId = user?.organizationId || user?.organization_id;
  const savedTheme = getOrgTheme(orgId);
  const themeColors = savedTheme || {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#10B981'
  };
  const [headlineType, setHeadlineType] = useState('customer');
  const [headlineText, setHeadlineText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (open) {
      setHeadlineType('customer');
      setHeadlineText('');
      setError(null);
      setSaving(false);
    } else {
      // Reset saving state when dialog closes
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!headlineText.trim()) {
      setError('Please enter headline text');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        type: headlineType,
        text: headlineText.trim()
      });
      setSaving(false);
      onOpenChange(false);
    } catch (error) {
      setError(error.message || 'Failed to save headline');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
              background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
            }}>
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Add Headline</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-6">
          {error && (
            <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            <Label htmlFor="headline-type" className="text-sm font-semibold text-slate-700">Headline Type</Label>
            <Select value={headlineType} onValueChange={setHeadlineType}>
              <SelectTrigger id="headline-type" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                <SelectItem value="customer">Customer Headline</SelectItem>
                <SelectItem value="employee">Employee Headline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="headline-text" className="text-sm font-semibold text-slate-700">
              Headline Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="headline-text"
              value={headlineText}
              onChange={(e) => setHeadlineText(e.target.value)}
              placeholder={headlineType === 'customer' 
                ? 'Enter customer headline (e.g., major wins, feedback, market changes)...' 
                : 'Enter employee headline (e.g., team updates, hiring, achievements)...'}
              rows={3}
              className="resize-none bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
            />
          </div>
        </div>

        <DialogFooter className="pt-6 border-t border-white/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!headlineText.trim() || saving}
            className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {saving ? 'Adding...' : 'Add Headline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HeadlineDialog;