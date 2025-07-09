import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit 10-Year Target™</DialogTitle>
            <DialogDescription>
              Define your organization's long-term vision and measurable target.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetDescription">10-Year Target Description</Label>
              <Textarea
                id="targetDescription"
                value={formData.targetDescription}
                onChange={(e) => setFormData({ ...formData, targetDescription: e.target.value })}
                placeholder="What will your organization achieve in 10 years?"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetYear">Target Year</Label>
                <Input
                  id="targetYear"
                  type="number"
                  value={formData.targetYear}
                  onChange={(e) => setFormData({ ...formData, targetYear: e.target.value })}
                  min={currentYear + 1}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentRunningTotal">Current Running Total</Label>
                <Input
                  id="currentRunningTotal"
                  value={formData.currentRunningTotal}
                  onChange={(e) => setFormData({ ...formData, currentRunningTotal: e.target.value })}
                  placeholder="e.g., $10M ARR, 500 customers"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="runningTotalDescription">Running Total Description</Label>
              <Input
                id="runningTotalDescription"
                value={formData.runningTotalDescription}
                onChange={(e) => setFormData({ ...formData, runningTotalDescription: e.target.value })}
                placeholder="What metric are you tracking? (e.g., Annual Revenue, Customer Count)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Target</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenYearTargetDialog;