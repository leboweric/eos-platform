import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

const ThreeYearPictureDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    revenue: '',
    profit: '',
    measurables: [],
    lookLikeItems: ['']
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      setFormData({
        revenue: data.revenue || '',
        profit: data.profit || '',
        measurables: data.measurables || [],
        lookLikeItems: data.lookLikeItems && data.lookLikeItems.length > 0 ? data.lookLikeItems : ['']
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
      setError(error.message || 'Failed to save 3-Year Picture');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>3-Year Picture</DialogTitle>
            <DialogDescription>
              Paint a picture of what your organization will look like in 3 years
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
                placeholder="e.g., $10M"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit">Profit Target</Label>
              <Input
                id="profit"
                value={formData.profit}
                onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                placeholder="e.g., $2M or 20%"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurables">Key Measurables</Label>
              <Textarea
                id="measurables"
                value={formData.measurables}
                onChange={(e) => setFormData({ ...formData, measurables: e.target.value })}
                placeholder="What are the 5-15 most important measurables in 3 years?"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>What Does It Look Like?</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    lookLikeItems: [...prev.lookLikeItems, '']
                  }))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.lookLikeItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Attribute ${index + 1}`}
                      value={item}
                      onChange={(e) => setFormData(prev => {
                        const newItems = [...prev.lookLikeItems];
                        newItems[index] = e.target.value;
                        return { ...prev, lookLikeItems: newItems };
                      })}
                    />
                    {formData.lookLikeItems.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          lookLikeItems: prev.lookLikeItems.filter((_, i) => i !== index)
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
                  Save 3-Year Picture
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ThreeYearPictureDialog;