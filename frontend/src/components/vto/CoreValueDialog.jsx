import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CoreValueDialog = ({ open, onOpenChange, value, onSave }) => {
  const [formData, setFormData] = useState({
    value: '',
    description: ''
  });

  useEffect(() => {
    if (value) {
      setFormData({
        value: value.value || '',
        description: value.description || ''
      });
    } else {
      setFormData({
        value: '',
        description: ''
      });
    }
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.value.trim()) {
      onSave({
        ...value,
        ...formData
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{value ? 'Edit Core Value' : 'Add Core Value'}</DialogTitle>
            <DialogDescription>
              Define a core value that guides your organization's culture and decisions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">Core Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., Integrity, Innovation, Excellence"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this value means for your organization..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {value ? 'Update' : 'Add'} Core Value
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CoreValueDialog;