import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const HeadlineDialog = ({ open, onOpenChange, onSave }) => {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Headline</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="headline-type">Headline Type</Label>
            <Select value={headlineType} onValueChange={setHeadlineType}>
              <SelectTrigger id="headline-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer Headline</SelectItem>
                <SelectItem value="employee">Employee Headline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline-text">Headline Text</Label>
            <Textarea
              id="headline-text"
              value={headlineText}
              onChange={(e) => setHeadlineText(e.target.value)}
              placeholder={headlineType === 'customer' 
                ? 'Enter customer headline (e.g., major wins, feedback, market changes)...' 
                : 'Enter employee headline (e.g., team updates, hiring, achievements)...'}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!headlineText.trim() || saving}
          >
            {saving ? 'Adding...' : 'Add Headline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HeadlineDialog;