import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

const OneYearPlanDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    date: '',
    revenue: '',
    profit: '',
    profitPercentage: '',
    goals: [],
    measurables: []
  });

  useEffect(() => {
    if (data) {
      setFormData({
        date: data.date || '',
        revenue: data.revenue || '',
        profit: data.profit || '',
        profitPercentage: data.profitPercentage || '',
        goals: data.goals || [],
        measurables: data.measurables || []
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      revenue: parseFloat(formData.revenue) || 0,
      profit: parseFloat(formData.profit) || 0,
      profitPercentage: parseFloat(formData.profitPercentage) || 0
    });
    onOpenChange(false);
  };

  const handleAddGoal = () => {
    setFormData({
      ...formData,
      goals: [
        ...formData.goals,
        { id: Date.now(), text: '', completed: false }
      ]
    });
  };

  const handleRemoveGoal = (id) => {
    setFormData({
      ...formData,
      goals: formData.goals.filter(g => g.id !== id)
    });
  };

  const handleGoalChange = (id, field, value) => {
    setFormData({
      ...formData,
      goals: formData.goals.map(g =>
        g.id === id ? { ...g, [field]: value } : g
      )
    });
  };

  const handleAddMeasurable = () => {
    setFormData({
      ...formData,
      measurables: [
        ...formData.measurables,
        { id: Date.now(), name: '', target: '' }
      ]
    });
  };

  const handleRemoveMeasurable = (id) => {
    setFormData({
      ...formData,
      measurables: formData.measurables.filter(m => m.id !== id)
    });
  };

  const handleMeasurableChange = (id, field, value) => {
    setFormData({
      ...formData,
      measurables: formData.measurables.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      )
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit 1-Year Plan</DialogTitle>
            <DialogDescription>
              Set your annual goals and financial targets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Target Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue Target</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  placeholder="e.g., 2000000"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profit">Profit Target</Label>
                <Input
                  id="profit"
                  type="number"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  placeholder="e.g., 300000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitPercentage">Profit Percentage</Label>
                <Input
                  id="profitPercentage"
                  type="number"
                  value={formData.profitPercentage}
                  onChange={(e) => setFormData({ ...formData, profitPercentage: e.target.value })}
                  placeholder="e.g., 15"
                  step="0.1"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Goals</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddGoal}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Goal
                </Button>
              </div>
              <div className="space-y-2">
                {formData.goals.map((goal) => (
                  <div key={goal.id} className="flex gap-2 items-center">
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={(checked) => handleGoalChange(goal.id, 'completed', checked)}
                    />
                    <Input
                      value={goal.text}
                      onChange={(e) => handleGoalChange(goal.id, 'text', e.target.value)}
                      placeholder="Goal description"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Measurables</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMeasurable}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Measurable
                </Button>
              </div>
              <div className="space-y-2">
                {formData.measurables.map((measurable) => (
                  <div key={measurable.id} className="flex gap-2 items-center">
                    <Input
                      value={measurable.name}
                      onChange={(e) => handleMeasurableChange(measurable.id, 'name', e.target.value)}
                      placeholder="Measurable name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={measurable.target}
                      onChange={(e) => handleMeasurableChange(measurable.id, 'target', e.target.value)}
                      placeholder="Target"
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMeasurable(measurable.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save 1-Year Plan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OneYearPlanDialog;