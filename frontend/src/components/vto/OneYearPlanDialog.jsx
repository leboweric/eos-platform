import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

const OneYearPlanDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    revenue: '',
    profit: '',
    targetDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0], // Default to Jan 1, 1 year from now
    goals: ['', '', ''], // Start with 3 goals
    measurables: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      setFormData({
        revenue: data.revenue || '',
        profit: data.profit || '',
        targetDate: data.target_date ? new Date(data.target_date).toISOString().split('T')[0] : new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0],
        goals: data.goals && Array.isArray(data.goals) && data.goals.length > 0 ? data.goals : ['', '', ''],
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
              <Label htmlFor="revenue">Revenue Target (in millions)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="revenue"
                  type="number"
                  step="0.001"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  placeholder="0.635"
                  className="pl-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">M</span>
              </div>
              <p className="text-xs text-gray-500">Enter value in millions (e.g., 0.635 for $635K, 10 for $10M)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit">Profit Target (%)</Label>
              <div className="relative">
                <Input
                  id="profit"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  placeholder="20"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500">Enter profit margin as a percentage</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">Select the date 1 year from now</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Goals (3-7)</Label>
                {formData.goals.length < 7 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      goals: [...prev.goals, '']
                    }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Goal ${index + 1}`}
                      value={goal}
                      onChange={(e) => setFormData(prev => {
                        const newGoals = [...prev.goals];
                        newGoals[index] = e.target.value;
                        return { ...prev, goals: newGoals };
                      })}
                    />
                    {formData.goals.length > 3 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          goals: prev.goals.filter((_, i) => i !== index)
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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