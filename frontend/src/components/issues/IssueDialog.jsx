import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertCircle,
  Save,
  Upload,
  X,
  Paperclip
} from 'lucide-react';

const IssueDialog = ({ open, onClose, onSave, issue, teamMembers, timeline }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ownerId: '',
    ownerName: '',
    status: 'open'
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (issue) {
      setFormData({
        title: issue.title || '',
        description: issue.description || '',
        ownerId: issue.owner_id || '',
        ownerName: issue.owner_name || '',
        status: issue.status || 'open'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        ownerName: '',
        status: 'open'
      });
    }
  }, [issue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Issue title is required');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await onSave({
        title: formData.title,
        description: formData.description,
        ownerId: formData.ownerId || null,
        status: formData.status,
        timeline: issue ? issue.timeline : timeline
      });
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save issue');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{issue ? 'Edit Issue' : 'Create New Issue'}</DialogTitle>
            <DialogDescription>
              {timeline === 'short_term' 
                ? 'Track an issue to be resolved this quarter'
                : 'Track an issue for next quarter'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">
                Issue Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide more details about the issue..."
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="owner">Owner</Label>
              <Select
                value={formData.ownerId}
                onValueChange={(userId) => {
                  const selectedUser = teamMembers.find(u => u.id === userId);
                  setFormData({ 
                    ...formData, 
                    ownerId: userId,
                    ownerName: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''
                  });
                }}
              >
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select an owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No owner</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {issue && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="attachments">Attachments</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('attachments').click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
                  </Button>
                  <span className="text-sm text-gray-500">
                    {attachments.length > 0 && `${attachments.length} file(s) selected`}
                  </span>
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {issue ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueDialog;