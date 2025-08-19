import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mountain } from 'lucide-react';

const TenYearTargetDialog = ({ open, onOpenChange, data, onSave }) => {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    targetDescription: '',
    targetYear: currentYear + 10,
    runningTotalDescription: '',
    currentRunningTotal: ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        targetDescription: data.target_description || data.targetDescription || '',
        targetYear: data.target_year || data.targetYear || currentYear + 10,
        runningTotalDescription: data.running_total_description || data.runningTotalDescription || '',
        currentRunningTotal: data.current_running_total || data.currentRunningTotal || ''
      });
    }
  }, [data, currentYear]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...data,
      targetDescription: formData.targetDescription,
      targetYear: parseInt(formData.targetYear),
      runningTotalDescription: formData.runningTotalDescription,
      currentRunningTotal: formData.currentRunningTotal
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                <Mountain className="h-5 w-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Edit 10-Year Target™
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 font-medium ml-11">
              Define your organization's long-term vision and measurable target.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetDescription" className="text-slate-700 font-medium">
                10-Year Target Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="targetDescription"
                value={formData.targetDescription}
                onChange={(e) => setFormData({ ...formData, targetDescription: e.target.value })}
                placeholder="What will your organization achieve in 10 years?"
                rows={3}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-emerald-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetYear" className="text-slate-700 font-medium">
                  Target Year <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="targetYear"
                  type="number"
                  value={formData.targetYear}
                  onChange={(e) => setFormData({ ...formData, targetYear: e.target.value })}
                  min={currentYear + 1}
                  required
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentRunningTotal" className="text-slate-700 font-medium">Current Running Total</Label>
                <Input
                  id="currentRunningTotal"
                  value={formData.currentRunningTotal}
                  onChange={(e) => setFormData({ ...formData, currentRunningTotal: e.target.value })}
                  placeholder="e.g., $10M ARR, 500 customers"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-emerald-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="runningTotalDescription" className="text-slate-700 font-medium">Running Total Description</Label>
              <Input
                id="runningTotalDescription"
                value={formData.runningTotalDescription}
                onChange={(e) => setFormData({ ...formData, runningTotalDescription: e.target.value })}
                placeholder="What metric are you tracking? (e.g., Annual Revenue, Customer Count)"
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-emerald-400"
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
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Save Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenYearTargetDialog;