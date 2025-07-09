import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

const ThreeYearPictureDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    date: '',
    revenue: '',
    profit: '',
    profitPercentage: '',
    description: '',
    measurables: []
  });

  useEffect(() => {
    if (data) {
      setFormData({
        date: data.date || '',
        revenue: data.revenue || '',
        profit: data.profit || '',
        profitPercentage: data.profitPercentage || '',
        description: data.description || '',
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
            <DialogTitle>Edit 3-Year Picture</DialogTitle>
            <DialogDescription>
              Define your organization's mid-term vision with specific financial and operational targets.
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
                  placeholder="e.g., 10000000"
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
                  placeholder="e.g., 2000000"
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
                  placeholder="e.g., 20"
                  step="0.1"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Vision Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what your organization will look like in 3 years..."
                rows={3}
                required
              />
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
            <Button type="submit">Save 3-Year Picture</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ThreeYearPictureDialog;