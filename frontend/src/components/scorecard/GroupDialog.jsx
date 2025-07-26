import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const GroupDialog = ({ 
  open, 
  onOpenChange, 
  group, 
  onSave,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6' // Default blue
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        color: group.color || '#3B82F6'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    }
  }, [group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    await onSave(formData);
    
    // Reset form if creating new
    if (!group) {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    }
  };

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#F59E0B', name: 'Amber' },
    { value: '#EF4444', name: 'Red' },
    { value: '#6B7280', name: 'Gray' },
    { value: '#EC4899', name: 'Pink' },
    { value: '#14B8A6', name: 'Teal' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{group ? 'Edit Group' : 'Create Group'}</DialogTitle>
            <DialogDescription>
              Organize your metrics into logical groups like Parts, Service, Sales, etc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Parts Department, Service Metrics"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what metrics this group contains"
                rows={2}
              />
            </div>
            
            <div>
              <Label>Group Color</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`h-10 rounded-md border-2 transition-all ${
                      formData.color === color.value 
                        ? 'border-gray-900 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {group ? 'Update' : 'Create'} Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GroupDialog;