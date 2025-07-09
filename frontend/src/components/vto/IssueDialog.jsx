import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const IssueDialog = ({ open, onOpenChange, issue, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    term: 'short', // 'short' or 'long'
    priority: 'medium',
    owner: '',
    department: ''
  });

  useEffect(() => {
    if (issue) {
      setFormData({
        title: issue.title || '',
        description: issue.description || '',
        term: issue.term || 'short',
        priority: issue.priority || 'medium',
        owner: issue.owner || '',
        department: issue.department || ''
      });
    } else {
      // Reset form for new issue
      setFormData({
        title: '',
        description: '',
        term: 'short',
        priority: 'medium',
        owner: '',
        department: ''
      });
    }
  }, [issue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...issue,
      ...formData,
      createdAt: issue?.createdAt || new Date().toISOString()
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{issue ? 'Edit Issue' : 'Add New Issue'}</DialogTitle>
            <DialogDescription>
              Identify and track obstacles that need to be solved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Customer complaints about response time"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue and its impact..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Issue Term</Label>
              <RadioGroup
                value={formData.term}
                onValueChange={(value) => setFormData({ ...formData, term: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="short" />
                  <Label htmlFor="short" className="font-normal">
                    Short Term (needs to be solved this quarter)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="long" />
                  <Label htmlFor="long" className="font-normal">
                    Long Term (save for next quarter)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Who will solve this issue?"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Operations, Customer Service"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {issue ? 'Save Issue' : 'Add Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueDialog;