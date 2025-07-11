import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle } from 'lucide-react';

const OneYearPlanDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    revenue: '',
    profit: '',
    goals: '',
    measurables: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      setFormData({
        revenue: data.revenue || '',
        profit: data.profit || '',
        goals: data.goals || '',
        measurables: data.measurables || ''
      });
    }
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setError(error.message || 'Failed to save 1-Year Plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>1-Year Plan</DialogTitle>
            <DialogDescription>
              Define your goals and targets for the coming year
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue Target</Label>
              <Input
                id="revenue"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                placeholder="e.g., $2M"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit">Profit Target</Label>
              <Input
                id="profit"
                value={formData.profit}
                onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                placeholder="e.g., $300K or 15%"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals (3-7)</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="List your 3-7 most important goals for the year..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurables">Key Measurables</Label>
              <Textarea
                id="measurables"
                value={formData.measurables}
                onChange={(e) => setFormData({ ...formData, measurables: e.target.value })}
                placeholder="What will you measure to track progress?"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save 1-Year Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OneYearPlanDialog;