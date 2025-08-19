import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, AlertCircle, Plus, Trash2, Target } from 'lucide-react';
import { getRevenueLabelWithSuffix } from '@/utils/revenueUtils';

const QuarterlyPrioritiesDialog = ({ open, onOpenChange, data, onSave, organization }) => {
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Quarterly Priorities
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 font-medium ml-11">
              Define your priorities and rocks for the quarter
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {error && (
              <Alert className="border-red-200/50 bg-red-50/80 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quarter" className="text-slate-700 font-medium">Quarter</Label>
                <Select
                  value={formData.quarter}
                  onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year" className="text-slate-700 font-medium">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  min={new Date().getFullYear() - 1}
                  max={new Date().getFullYear() + 2}
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-orange-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue" className="text-slate-700 font-medium">Quarterly {getRevenueLabelWithSuffix(organization, 'Target')}</Label>
                <Input
                  id="revenue"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  placeholder="e.g., $500K"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-orange-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit" className="text-slate-700 font-medium">Quarterly Profit Target</Label>
                <Input
                  id="profit"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  placeholder="e.g., $75K or 15%"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-orange-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-700 font-medium">
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
                      <div className="flex-1 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl px-3 py-2 text-amber-900 font-medium border border-orange-200/50">
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
                    className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-orange-400"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPriority}
                    disabled={!newPriority.trim()}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rocks" className="text-slate-700 font-medium">Rocks (Company Priorities)</Label>
              <Textarea
                id="rocks"
                value={formData.rocks}
                onChange={(e) => setFormData({ ...formData, rocks: e.target.value })}
                placeholder="List your company rocks for this quarter..."
                rows={4}
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-orange-400"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving || formData.priorities.length < 3}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
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