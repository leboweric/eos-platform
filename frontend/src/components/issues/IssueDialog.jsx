import { useState, useEffect, useRef, useCallback } from 'react';
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
import TeamMemberSelect from '../shared/TeamMemberSelect';

const IssueDialog = ({ 
  open, 
  onClose, 
  onSave, 
  issue, 
  teamMembers, 
  teamId,
  timeline,
  onMoveToTeam,
  onCreateTodo,
  onSendCascadingMessage,
  onTimelineChange,
  onConvertToRock,
  isQuarterlyMeeting = false
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
  
  // Auto-save state
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);

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
      // Default to current user for new issues
      setFormData({
        title: '',
        description: '',
        ownerId: user?.id || '',
        ownerName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
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
      // Default to current user for new issues
      setFormData({
        title: '',
        description: '',
        ownerId: user?.id || '',
        ownerName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
        status: 'open'
      });
      setNewAttachments([]);
      setExistingAttachments([]);
      setUpdates([]);
      setUpdateText('');
      setShowAddUpdate(false);
      setError(null);
    }
  }, [open, issue, user]);

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

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    // Require at least a title to auto-save
    if (!formData.title.trim()) return;
    
    try {
      setAutoSaving(true);
      const savedIssue = await onSave({
        ...(issue?.id ? { id: issue.id } : {}), // Include ID if editing existing
        title: formData.title,
        description: formData.description,
        ownerId: formData.ownerId === 'no-owner' ? null : (formData.ownerId || null),
        status: formData.status,
        timeline: issue ? issue.timeline : timeline
      }, { isAutoSave: true }); // Pass flag to indicate this is an auto-save
      setLastSaved(new Date());
      
      // If this was a new issue, update the issue object with the returned ID
      // This allows subsequent auto-saves to update the same issue
      if (!issue?.id && savedIssue?.id) {
        // Note: We can't directly update the 'issue' prop, but the parent component
        // should handle this through onSave callback
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [issue, formData, onSave, timeline]);

  // Auto-save effect - triggers 2 seconds after last change
  useEffect(() => {
    // Don't auto-save if there's no title yet
    if (!formData.title.trim()) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000); // 2 second debounce
    
    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData.title, formData.description, formData.ownerId, formData.status, performAutoSave, issue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Issue title is required');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Save the issue first - include the ID if editing an existing issue
      const savedIssue = await onSave({
        ...(issue?.id ? { id: issue.id } : {}), // Include ID if editing
        title: formData.title,
        description: formData.description,
        ownerId: formData.ownerId === 'no-owner' ? null : (formData.ownerId || null),
        status: formData.status,
        timeline: issue ? issue.timeline : timeline,
        // Include headline ID if this issue is being created from a headline
        ...(issue?.headlineId ? { related_headline_id: issue.headlineId } : {})
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
      <DialogContent className="fixed right-0 top-0 left-auto translate-x-0 translate-y-0 h-screen w-[600px] max-w-[90vw] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-l border-white/20 dark:border-gray-700/50 shadow-2xl rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300">
        <div className="h-full overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <DialogHeader className="pb-4">
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
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  {issue ? 'Edit Issue' : 'Create New Issue'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 grid gap-4 py-4 overflow-y-auto">
            {error && (
              <Alert className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* First row: Title takes 2/3, Owner takes 1/3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Issue Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onFocus={(e) => {
                    // Prevent text selection by immediately collapsing selection to cursor position
                    setTimeout(() => {
                      const length = e.target.value.length;
                      e.target.setSelectionRange(length, length);
                    }, 0);
                  }}
                  placeholder="Brief description of the issue"
                  className="ml-1.5 px-3 py-2 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="owner" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Owner</Label>
                {teamId ? (
                  <TeamMemberSelect
                    teamId={teamId}
                    value={formData.ownerId}
                    onValueChange={(userId) => {
                      if (!userId) {
                        setFormData({ 
                          ...formData, 
                          ownerId: '',
                          ownerName: ''
                        });
                      } else {
                        // Try to find user in teamMembers for backward compatibility
                        const selectedUser = teamMembers?.find(u => u.id === userId);
                        setFormData({ 
                          ...formData, 
                          ownerId: userId,
                          ownerName: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''
                        });
                      }
                    }}
                    placeholder="Select an owner (optional)"
                    className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm"
                    includeAllIfLeadership={true}
                    allowUnassigned={true}
                    unassignedLabel="No owner"
                    showMemberCount={false}
                  />
                ) : (
                  // Fallback to original Select if no teamId
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
                        const selectedUser = teamMembers?.find(u => u.id === userId);
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
                )}
              </div>
            </div>

            {/* Second row: Summary full width */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Summary</Label>
              <div className="max-h-[200px] overflow-y-auto border rounded-xl shadow-sm">
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Provide a brief summary of the issue..."
                  className="border-0 shadow-none"
                />
              </div>
            </div>

            {/* Third row: Updates - only show for existing issues */}
            {issue && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
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
                      className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 focus:border-blue-400 rounded-xl shadow-sm"
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
                  <div className="space-y-2 max-h-32 overflow-y-auto p-1">
                    {updates.map(update => (
                      <div key={update.id} className="group bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">{update.update_text}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {update.created_by_name} • {new Date(update.created_at).toLocaleDateString()}
                              </p>
                            </div>
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
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No updates yet</p>
                )}
              </div>
            )}

            {/* Fourth row: Attachments */}
            <div className="space-y-3">
              <Label htmlFor="attachments" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Attachments</Label>
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
              {isQuarterlyMeeting && onConvertToRock && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    onConvertToRock(issue);
                    onClose();
                  }}
                  className="text-sm whitespace-nowrap"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Convert to Rock
                </Button>
              )}
            </div>
          )}

          <DialogFooter className="pt-6">
            {/* Auto-save indicator */}
            <div className="flex-1 flex items-center gap-2 text-sm text-slate-500">
              {autoSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
              ) : null}
            </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IssueDialog;