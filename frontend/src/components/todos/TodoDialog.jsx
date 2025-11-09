import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Calendar, User, Users, Paperclip, X, Download, Link, Sparkles, CheckSquare, MessageSquare, Plus, Trash2, Upload, Check, ChevronDown } from 'lucide-react';
import { todosService } from '../../services/todosService';
import { useAuthStore } from '../../stores/authStore';
import { getDateDaysFromNow } from '../../utils/dateUtils';
import { getOrgTheme } from '../../utils/themeUtils';
import TeamMemberSelect from '../shared/TeamMemberSelect';
import { useTeamMembers } from '../../hooks/useTeamMembers';

const TodoDialog = ({ open, onOpenChange, todo, todoFromIssue, teamMembers, teamId, onSave, onCreateIssue }) => {
  const { user } = useAuthStore();
  
  // Get filtered team members for department filtering
  const { members: filteredMembers, loading: membersLoading } = useTeamMembers(teamId, {
    includeAllIfLeadership: true,
    activeOnly: true,
    sortBy: 'name'
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: '',
    assignedToIds: [], // For multi-assignment
    isMultiAssignee: false,
    dueDate: '',
    linkedIssueId: null,
    linkedPriorityId: null
  });
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
    };

    if (showAssigneeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAssigneeDropdown]);

  useEffect(() => {
    if (todo) {
      // Check if it's a multi-assignee todo
      const isMulti = todo.is_multi_assignee || (todo.assignees && todo.assignees.length > 0);
      const assigneeIds = todo.assignees ? todo.assignees.map(a => a.user_id || a.id) : [];
      
      setFormData({
        title: todo.title || '',
        description: todo.description || '',
        assignedToId: !isMulti ? (todo.assigned_to_id || todo.assignee_id || todo.assignedToId || '') : '',
        assignedToIds: isMulti ? assigneeIds : [],
        isMultiAssignee: isMulti,
        dueDate: todo.due_date ? todo.due_date.split('T')[0] : '', // Use date string directly, don't convert
        linkedIssueId: todo.linked_issue_id || todo.linkedIssueId || null,
        linkedPriorityId: todo.linked_priority_id || todo.linkedPriorityId || null
      });
      
      // Load existing attachments and updates
      if (todo.id) {
        loadAttachments(todo.id);
        loadUpdates(todo.id);
      }
    } else {
      // Clear all fields and set default due date for new todos, default to current user
      setFormData({
        title: '',
        description: '',
        assignedToId: user?.id || '',
        assignedToIds: [],
        isMultiAssignee: false,
        dueDate: getDateDaysFromNow(7),
        linkedIssueId: null,
        linkedPriorityId: null
      });
      setExistingAttachments([]);
    }
    setFiles([]);
  }, [todo]);

  // Clear form when dialog opens without a todo or set from issue
  useEffect(() => {
    if (open && !todo) {
      if (todoFromIssue) {
        // Pre-populate from issue/priority - using data passed from the context menu
        setFormData({
          title: todoFromIssue.title || '',
          description: todoFromIssue.description || '',
          assignedToId: todoFromIssue.assignedToId || todoFromIssue.owner_id || user?.id || '',
          assignedToIds: [],
          isMultiAssignee: false,
          dueDate: todoFromIssue.dueDate || getDateDaysFromNow(7),
          linkedIssueId: todoFromIssue.linkedIssueId || null,
          linkedPriorityId: todoFromIssue.linkedPriorityId || null
        });
      } else {
        // Clear form, default to current user
        setFormData({
          title: '',
          description: '',
          assignedToId: user?.id || '',
          assignedToIds: [],
          isMultiAssignee: false,
          dueDate: getDateDaysFromNow(7),
          linkedIssueId: null,
          linkedPriorityId: null
        });
      }
      setFiles([]);
      setExistingAttachments([]);
      setUpdates([]);
      setUpdateText('');
      setShowAddUpdate(false);
      setError(null);
    }
  }, [open, todo, todoFromIssue, user]);

  const loadAttachments = async (todoId) => {
    try {
      setLoadingAttachments(true);
      const attachments = await todosService.getAttachments(todoId);
      setExistingAttachments(attachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      // Silently fail for now until migration runs
      setExistingAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    // Require at least a title to auto-save
    if (!formData.title.trim()) return;
    
    try {
      setAutoSaving(true);
      const submitData = {
        ...formData,
        ...(todo?.id ? { id: todo.id } : {}), // Include ID if editing existing
        ...(formData.isMultiAssignee && { assignedToIds: formData.assignedToIds })
      };
      const savedTodo = await onSave(submitData, { isAutoSave: true }); // Pass flag to indicate this is an auto-save
      setLastSaved(new Date());
      setHasUnsavedChanges(false); // Clear unsaved changes flag after successful save
      
      // If this was a new todo, update the todo object with the returned ID
      // This allows subsequent auto-saves to update the same todo
      if (!todo?.id && savedTodo?.id) {
        // Note: We can't directly update the 'todo' prop, but the parent component
        // should handle this through onSave callback
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [todo, formData, onSave]);

  // Auto-save effect - triggers 2 seconds after last change
  useEffect(() => {
    // Don't auto-save if there's no title yet
    if (!formData.title.trim()) return;
    
    // Mark as having unsaved changes when user types
    setHasUnsavedChanges(true);
    
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
  }, [formData.title, formData.description, formData.assignedToId, formData.assignedToIds, formData.dueDate, performAutoSave, todo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Pass the appropriate assignee data based on multi-assignee mode
      const submitData = {
        ...formData,
        // Include assignedToIds only if multi-assignee mode is enabled
        ...(formData.isMultiAssignee && { assignedToIds: formData.assignedToIds })
      };
      const savedTodo = await onSave(submitData);
      
      // Upload any new files
      if (savedTodo && savedTodo.id && files.length > 0) {
        const uploadErrors = [];
        let successfulUploads = 0;
        
        for (const file of files) {
          try {
            await todosService.uploadAttachment(savedTodo.id, file);
            successfulUploads++;
          } catch (uploadError) {
            console.error('Failed to upload file:', file.name, uploadError);
            uploadErrors.push(`Failed to upload ${file.name}`);
          }
        }
        
        // If there were upload errors, show them but don't prevent dialog close
        if (uploadErrors.length > 0) {
          setError(`Todo saved but some attachments failed: ${uploadErrors.join(', ')}`);
          // Don't close dialog if all uploads failed
          if (successfulUploads === 0) {
            setSaving(false);
            return;
          }
          // Clear error after 5 seconds if some uploads succeeded
          setTimeout(() => setError(null), 5000);
        }
      }
      
      // Reset form
      setFiles([]);
      setExistingAttachments([]);
      onOpenChange(false);
    } catch (error) {
      setError(error.message || 'Failed to save todo');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const deleteAttachment = async (attachmentId) => {
    if (!todo?.id) return;
    
    try {
      await todosService.deleteAttachment(todo.id, attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      setError('Failed to delete attachment');
    }
  };

  const loadUpdates = async (todoId) => {
    try {
      setLoadingUpdates(true);
      const response = await todosService.getTodoUpdates(todoId);
      setUpdates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch updates:', error);
      setUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !todo?.id) return;
    
    try {
      setSavingUpdate(true);
      const response = await todosService.addTodoUpdate(todo.id, updateText);
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
      await todosService.deleteTodoUpdate(todo.id, updateId);
      setUpdates(updates.filter(u => u.id !== updateId));
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed right-0 top-0 left-auto translate-x-0 translate-y-0 h-screen w-[500px] max-w-[90vw] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-l border-white/20 dark:border-gray-700/50 shadow-2xl rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300">
        <div className="h-full overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}
              >
                <CheckSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  {todo ? 'Edit To-Do' : 'Create To-Do'}
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 mt-1">
                  {todo ? 'Update the to-do details below' : 'Create a new to-do item with automatic 7-day due date'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 space-y-6 py-6 overflow-y-auto">
            {/* Show linked item indicator */}
            {(todoFromIssue?.linkedIssueId || todoFromIssue?.linkedPriorityId) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Link className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {todoFromIssue.linkedIssueId ? 'Linked to Issue:' : 'Linked to Rock:'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {todoFromIssue.title}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <Alert className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 pt-6">
              <Label htmlFor="title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title *</Label>
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
                placeholder="Enter to-do title..."
                required
                className="ml-1.5 px-3 py-2 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
              <div className="max-h-[200px] overflow-y-auto border dark:border-gray-600/50 rounded-xl shadow-sm">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide additional details..."
                  rows={4}
                  className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-0 rounded-xl shadow-none transition-all duration-200 resize-none min-h-[120px]"
                />
              </div>
            </div>

            {/* Updates section - only show for existing todos */}
            {todo && (
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

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="assignedTo" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    {formData.isMultiAssignee ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    Owner
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        isMultiAssignee: !formData.isMultiAssignee,
                        assignedToIds: formData.isMultiAssignee ? [] : (formData.assignedToId ? [formData.assignedToId] : []),
                        assignedToId: !formData.isMultiAssignee ? '' : formData.assignedToIds[0] || ''
                      });
                    }}
                    className="text-xs"
                  >
                    {formData.isMultiAssignee ? 'Switch to Single' : 'Switch to Multiple'}
                  </Button>
                </div>
                
                {formData.isMultiAssignee ? (
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      className="bg-white/80 backdrop-blur-sm border border-white/20 focus-within:border-blue-400 rounded-xl shadow-sm p-2 min-h-[40px] cursor-pointer flex flex-wrap items-center gap-1"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    >
                      {formData.assignedToIds.length > 0 ? (
                        formData.assignedToIds.map(id => {
                          // Use filtered members if available, fallback to teamMembers for backward compatibility
                          const membersList = filteredMembers.length > 0 ? filteredMembers : teamMembers;
                          const member = membersList.find(m => m.id === id);
                          return member ? (
                            <div key={id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm">
                              <span>{member.first_name} {member.last_name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData({
                                    ...formData,
                                    assignedToIds: formData.assignedToIds.filter(aid => aid !== id)
                                  });
                                }}
                                className="hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : null;
                        })
                      ) : (
                        <span className="text-gray-400">Select team members...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                    </div>
                    
                    {showAssigneeDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {membersLoading ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Loading team members...</div>
                        ) : (
                          // Use filtered members if available, fallback to teamMembers for backward compatibility
                          (filteredMembers.length > 0 ? filteredMembers : teamMembers).map(member => {
                            const isSelected = formData.assignedToIds.includes(member.id);
                            return (
                              <div
                                key={member.id}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    assignedToIds: isSelected
                                      ? formData.assignedToIds.filter(id => id !== member.id)
                                      : [...formData.assignedToIds, member.id]
                                  });
                                }}
                              >
                                <span className="text-sm">
                                  {member.first_name} {member.last_name}
                                </span>
                                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  teamId ? (
                    <TeamMemberSelect
                      teamId={teamId}
                      value={formData.assignedToId}
                      onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                      placeholder="Select team member"
                      className="bg-white/80 backdrop-blur-sm border-white/20 focus:border-blue-400 rounded-xl shadow-sm"
                      includeAllIfLeadership={true}
                      showMemberCount={false}
                    />
                  ) : (
                    // Fallback to original Select if no teamId (for backward compatibility)
                    <Select 
                      value={formData.assignedToId} 
                      onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                    >
                      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 focus:border-blue-400 rounded-xl shadow-sm">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                        {teamMembers && teamMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="dueDate" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
                className="px-3 py-2 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
              />
              <p className="text-xs text-slate-500">Defaults to 7 days from creation</p>
            </div>

            {/* Attachments section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </Label>
              
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  {existingAttachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
                      <span className="text-sm flex-1 truncate font-medium">{attachment.file_name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await todosService.downloadAttachment(todo.id, attachment.id, attachment.file_name);
                            } catch (error) {
                              setError(error.message || 'Failed to download attachment');
                            }
                          }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttachment(attachment.id)}
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
                      <span className="text-sm font-medium">{file.name} <span className="text-blue-600">(new)</span></span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
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
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 bg-white/40'
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

          <DialogFooter className="flex justify-between pt-6 border-t border-white/20">
            <div className="flex-1 flex items-center gap-4">
              {todo && onCreateIssue && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onCreateIssue(todo);
                    onOpenChange(false);
                  }}
                  className="mr-auto bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                >
                  <Link className="mr-2 h-4 w-4" />
                  Create Linked Issue
                </Button>
              )}
              {(autoSaving || hasUnsavedChanges) && (
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <span>Auto Saving</span>
                  <span className="flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}>.</span>
                  </span>
                </div>
              )}
              {!autoSaving && !hasUnsavedChanges && lastSaved && (
                <span className="text-sm text-gray-500">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {todo ? 'Close' : 'Create'} To-Do
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TodoDialog;