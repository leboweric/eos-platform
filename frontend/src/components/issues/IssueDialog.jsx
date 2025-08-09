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
  Paperclip,
  Download,
  Trash2
} from 'lucide-react';
import { issuesService } from '../../services/issuesService';

const IssueDialog = ({ open, onClose, onSave, issue, teamMembers, timeline }) => {
  console.log('=== INSIDE ISSUE DIALOG COMPONENT ===', {
    open,
    issue,
    teamMembersCount: teamMembers?.length || 0,
    timeline
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ownerId: '',
    ownerName: '',
    status: 'open'
  });
  const [newAttachments, setNewAttachments] = useState([]); // Files to upload
  const [existingAttachments, setExistingAttachments] = useState([]); // Already uploaded
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
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
      // Load existing attachments if editing
      fetchAttachments(issue.id);
    } else {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        ownerName: '',
        status: 'open'
      });
      setExistingAttachments([]);
    }
    setNewAttachments([]);
  }, [issue]);

  // Clear form when dialog opens without an issue
  useEffect(() => {
    if (open && !issue) {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        ownerName: '',
        status: 'open'
      });
      setNewAttachments([]);
      setExistingAttachments([]);
      setError(null);
    }
  }, [open, issue]);

  const fetchAttachments = async (issueId) => {
    try {
      const attachments = await issuesService.getAttachments(issueId);
      setExistingAttachments(attachments);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Issue title is required');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Save the issue first
      const savedIssue = await onSave({
        title: formData.title,
        description: formData.description,
        ownerId: formData.ownerId === 'no-owner' ? null : (formData.ownerId || null),
        status: formData.status,
        timeline: issue ? issue.timeline : timeline
      });
      
      // Upload new attachments if any
      if (newAttachments.length > 0 && (issue || savedIssue)) {
        setUploadingFiles(true);
        const issueId = issue?.id || savedIssue?.id;
        
        for (const file of newAttachments) {
          try {
            await issuesService.uploadAttachment(issueId, file);
          } catch (error) {
            console.error('Failed to upload file:', file.name, error);
          }
        }
        setUploadingFiles(false);
      }
      
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save issue');
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewAttachments(prev => [...prev, ...files]);
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      await issuesService.deleteAttachment(issue.id, attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      setError('Failed to delete attachment');
    }
  };

  const handleDownloadAttachment = async (attachmentId, fileName) => {
    try {
      const blob = await issuesService.downloadAttachment(issue.id, attachmentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      setError('Failed to download attachment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('Dialog onOpenChange called with:', newOpen);
      if (!newOpen) {
        // Only call onClose when dialog is being closed (false), not opened (true)
        onClose();
      }
    }}>
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
                value={formData.ownerId || 'no-owner'}
                onValueChange={(userId) => {
                  if (userId === 'no-owner') {
                    setFormData({ 
                      ...formData, 
                      ownerId: '',
                      ownerName: ''
                    });
                  } else {
                    const selectedUser = teamMembers.find(u => u.id === userId);
                    setFormData({ 
                      ...formData, 
                      ownerId: userId,
                      ownerName: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''
                    });
                  }
                }}
              >
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select an owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-owner">No owner</SelectItem>
                  {(teamMembers || []).map(member => (
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
                    <SelectItem value="closed">Solved</SelectItem>
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
                    {newAttachments.length > 0 && `${newAttachments.length} new file(s) selected`}
                  </span>
                </div>
                
                {/* Existing attachments */}
                {issue && existingAttachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Current attachments:</p>
                    {(existingAttachments || []).map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{attachment.file_name}</span>
                          <span className="text-xs text-gray-500">
                            ({(attachment.file_size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExistingAttachment(attachment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* New attachments to upload */}
                {newAttachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Files to upload:</p>
                    {(newAttachments || []).map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewAttachment(index)}
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
            <Button type="submit" disabled={loading || uploadingFiles}>
              {loading || uploadingFiles ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingFiles ? 'Uploading files...' : 'Saving...'}
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