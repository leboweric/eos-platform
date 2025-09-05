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
import RichTextEditor from '@/components/ui/RichTextEditor';
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
  Trash2,
  Sparkles,
  Bug,
  Users,
  ListTodo,
  Send,
  MessageSquare,
  Plus,
  ArrowLeftRight
} from 'lucide-react';
import { issuesService } from '../../services/issuesService';
import { getOrgTheme } from '../../utils/themeUtils';
import { useAuthStore } from '../../stores/authStore';

const IssueDialog = ({ 
  open, 
  onClose, 
  onSave, 
  issue, 
  teamMembers, 
  timeline,
  onMoveToTeam,
  onCreateTodo,
  onSendCascadingMessage,
  onTimelineChange
}) => {
  const { user } = useAuthStore();
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
  const [isDragging, setIsDragging] = useState(false);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  // Updates state
  const [updates, setUpdates] = useState([]);
  const [updateText, setUpdateText] = useState('');
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [showAddUpdate, setShowAddUpdate] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      const orgId = user?.organizationId || user?.organization_id;
      if (orgId) {
        const theme = await getOrgTheme(orgId);
        // Only update if theme is not null and has required properties
        if (theme && theme.primary && theme.secondary) {
          setThemeColors(theme);
        }
      }
    };
    fetchTheme();
  }, [user]);

  useEffect(() => {
    if (issue) {
      setFormData({
        title: issue.title || '',
        description: issue.description || '',
        ownerId: issue.owner_id || '',
        ownerName: issue.owner_name || '',
        status: issue.status || 'open'
      });
      // Load existing attachments and updates if editing
      fetchAttachments(issue.id);
      fetchUpdates(issue.id);
    } else {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        ownerName: '',
        status: 'open'
      });
      setExistingAttachments([]);
      setUpdates([]);
    }
    setNewAttachments([]);
    setUpdateText('');
    setShowAddUpdate(false);
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
      setUpdates([]);
      setUpdateText('');
      setShowAddUpdate(false);
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

  const fetchUpdates = async (issueId) => {
    try {
      setLoadingUpdates(true);
      const response = await issuesService.getIssueUpdates(issueId);
      setUpdates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch updates:', error);
      setUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !issue?.id) return;
    
    try {
      setSavingUpdate(true);
      const response = await issuesService.addIssueUpdate(issue.id, updateText);
      setUpdates([response.data, ...updates]);
      setUpdateText('');
      setShowAddUpdate(false);
    } catch (error) {
      console.error('Failed to add update:', error);
      setError('Failed to add update');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!confirm('Are you sure you want to delete this update?')) return;
    
    try {
      await issuesService.deleteIssueUpdate(issue.id, updateId);
      setUpdates(updates.filter(u => u.id !== updateId));
    } catch (error) {
      console.error('Failed to delete update:', error);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
    
    if (droppedFiles.length !== validFiles.length) {
      setError('Some files exceed 10MB limit and were not added');
      setTimeout(() => setError(null), 3000);
    }
    
    setNewAttachments(prev => [...prev, ...validFiles]);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // Only call onClose when dialog is being closed (false), not opened (true)
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[900px] w-full max-h-[90vh] overflow-hidden flex flex-col bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}
              >
                <Bug className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {issue ? 'Edit Issue' : 'Create New Issue'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {error && (
              <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* First row: Title takes 2/3, Owner takes 1/3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-3 md:col-span-2">
                <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
                  Issue Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                  placeholder="Brief description of the issue"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="owner" className="text-sm font-semibold text-slate-700">Owner</Label>
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
                <SelectTrigger id="owner" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                  <SelectValue placeholder="Select an owner (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                  <SelectItem value="no-owner">No owner</SelectItem>
                  {(teamMembers || []).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>

            {/* Second row: Details full width */}
            <div className="grid gap-3">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Details</Label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Provide more details about the issue..."
                className="shadow-sm"
              />
            </div>

            {/* Third row: Attachments */}
            <div className="grid gap-3">
              <Label htmlFor="attachments" className="text-sm font-semibold text-slate-700">Attachments</Label>
              <div className="space-y-2">
                
                {/* Existing attachments */}
                {issue && existingAttachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Current attachments:</p>
                    {(existingAttachments || []).map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{attachment.file_name}</span>
                          <span className="text-xs text-slate-500">
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
                  <div className="space-y-2">
                    {newAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50/80 backdrop-blur-sm rounded-xl border border-green-200/50">
                        <span className="text-sm font-medium">{file.name} <span className="text-green-600">(new)</span></span>
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
                
                <label className="block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div 
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 backdrop-blur-sm ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 bg-white/40'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Paperclip className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 font-medium">
                      {isDragging ? 'Drop files here...' : 'Click here to choose files or drag and drop'}
                    </p>
                  </div>
                </label>
                <p className="text-xs text-slate-500">Max file size: 10MB</p>
              </div>
            </div>
            {/* Updates Section - only show for existing issues */}
            {issue && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Updates ({updates.length})
                  </Label>
                  {!showAddUpdate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddUpdate(true)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Update
                    </Button>
                  )}
                </div>

                {/* Add Update Form */}
                {showAddUpdate && (
                  <div className="space-y-2">
                    <Textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="Add an update..."
                      rows={3}
                      className="bg-white/80 backdrop-blur-sm border-white/20 focus:border-blue-400 rounded-xl shadow-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddUpdate}
                        disabled={!updateText.trim() || savingUpdate}
                        className="text-white"
                        style={{
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                        }}
                      >
                        {savingUpdate ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Add Update'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddUpdate(false);
                          setUpdateText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Updates List */}
                {loadingUpdates ? (
                  <div className="text-sm text-slate-500">Loading updates...</div>
                ) : updates.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {updates.map(update => (
                      <div key={update.id} className="group bg-slate-50/80 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{update.update_text}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {update.created_by_name} • {new Date(update.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUpdate(update.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !showAddUpdate && (
                  <p className="text-sm text-slate-500 text-center py-2">No updates yet</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons for existing issues */}
          {issue && (
            <div className="flex flex-row gap-2 pb-4 border-b border-white/20 overflow-x-auto">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={async () => {
                  // Default to short_term if timeline is not set
                  const currentTimeline = issue.timeline || 'short_term';
                  const newTimeline = currentTimeline === 'short_term' ? 'long_term' : 'short_term';
                  
                  console.log('🔄 IssueDialog: Move button clicked');
                  console.log('  - Issue ID:', issue.id);
                  console.log('  - Current timeline:', currentTimeline);
                  console.log('  - New timeline:', newTimeline);
                  console.log('  - onTimelineChange available?', !!onTimelineChange);
                  
                  try {
                    // If onTimelineChange is provided, use it (it handles the update and UI refresh)
                    if (onTimelineChange) {
                      console.log('🎯 IssueDialog: Calling onTimelineChange...');
                      await onTimelineChange(issue.id, newTimeline);
                      console.log('✅ IssueDialog: onTimelineChange completed');
                    } else {
                      console.log('⚠️ IssueDialog: No onTimelineChange, using direct update');
                      // Fallback to direct update if no callback provided
                      await issuesService.updateIssue(issue.id, { timeline: newTimeline });
                    }
                    console.log('🚪 IssueDialog: Closing dialog...');
                    // Close the dialog after successful update
                    onClose();
                  } catch (error) {
                    console.error('❌ IssueDialog: Failed to update issue timeline:', error);
                  }
                }}
                className="text-sm whitespace-nowrap"
              >
                <ArrowLeftRight className="mr-1 h-3 w-3" />
                Move to {(issue.timeline || 'short_term') === 'short_term' ? 'Long Term' : 'Short Term'}
              </Button>
              {onMoveToTeam && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    onMoveToTeam(issue);
                    onClose();
                  }}
                  className="text-sm whitespace-nowrap"
                >
                  <Users className="mr-1 h-3 w-3" />
                  Send to Team
                </Button>
              )}
              {onCreateTodo && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    onCreateTodo(issue);
                    onClose();
                  }}
                  className="text-sm whitespace-nowrap"
                >
                  <ListTodo className="mr-1 h-3 w-3" />
                  Create To-Do
                </Button>
              )}
            </div>
          )}

          <DialogFooter className="pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploadingFiles}
              className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
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