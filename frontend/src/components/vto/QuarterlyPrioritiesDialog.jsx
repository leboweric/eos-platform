import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

const QuarterlyPrioritiesDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    quarter: '',
    year: new Date().getFullYear(),
    revenue: '',
    profit: '',
    priorities: [],
    rocks: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newPriority, setNewPriority] = useState('');

  useEffect(() => {
    if (data) {
      setFormData({
        quarter: data.quarter || getCurrentQuarter(),
        year: data.year || new Date().getFullYear(),
        revenue: data.revenue || '',
        profit: data.profit || '',
        priorities: data.priorities || [],
        rocks: data.rocks || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        quarter: getCurrentQuarter()
      }));
    }
  }, [data]);

  const getCurrentQuarter = () => {
    const month = new Date().getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  };

  const handleAddPriority = () => {
    if (!newPriority.trim()) return;
    
    if (formData.priorities.length >= 7) {
      setError('Maximum 7 priorities allowed');
      return;
    }
    
    setFormData({
      ...formData,
      priorities: [...formData.priorities, {
        id: Date.now(),
        text: newPriority.trim(),
        completed: false
      }]
    });
    setNewPriority('');
    setError(null);
  };

  const handleRemovePriority = (id) => {
    setFormData({
      ...formData,
      priorities: formData.priorities.filter(p => p.id !== id)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.priorities.length < 3) {
      setError('Please add at least 3 priorities');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setError(error.message || 'Failed to save Quarterly Priorities');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quarterly Priorities</DialogTitle>
            <DialogDescription>
              Define your priorities and rocks for the quarter
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quarter">Quarter</Label>
                <Select
                  value={formData.quarter}
                  onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  min={new Date().getFullYear() - 1}
                  max={new Date().getFullYear() + 2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue">Quarterly Revenue Target</Label>
                <Input
                  id="revenue"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  placeholder="e.g., $500K"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit">Quarterly Profit Target</Label>
                <Input
                  id="profit"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  placeholder="e.g., $75K or 15%"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Priorities (3-7) <span className="text-red-500">*</span>
                </Label>
                <span className={`text-sm font-medium ${
                  formData.priorities.length < 3 ? 'text-red-600' : 
                  formData.priorities.length > 7 ? 'text-orange-600' : 
                  'text-green-600'
                }`}>
                  {formData.priorities.length}/7
                </span>
              </div>
              
              {/* Existing priorities */}
              {formData.priorities.length > 0 && (
                <div className="space-y-2">
                  {formData.priorities.map((priority, index) => (
                    <div key={priority.id} className="flex items-center gap-2">
                      <span className="text-gray-400 w-6">{index + 1}.</span>
                      <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2 text-amber-900">
                        {priority.text}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePriority(priority.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new priority */}
              {formData.priorities.length < 7 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a priority..."
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPriority();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddPriority}
                    disabled={!newPriority.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rocks">Rocks (Company Priorities)</Label>
              <Textarea
                id="rocks"
                value={formData.rocks}
                onChange={(e) => setFormData({ ...formData, rocks: e.target.value })}
                placeholder="List your company rocks for this quarter..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || formData.priorities.length < 3}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Quarterly Priorities
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuarterlyPrioritiesDialog;