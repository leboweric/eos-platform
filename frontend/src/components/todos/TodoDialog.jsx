import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Calendar, User, Paperclip, X, Download, Link, Sparkles, CheckSquare } from 'lucide-react';
import { todosService } from '../../services/todosService';
import { useAuthStore } from '../../stores/authStore';
import { getDateDaysFromNow } from '../../utils/dateUtils';
import { getOrgTheme } from '../../utils/themeUtils';

const TodoDialog = ({ open, onOpenChange, todo, todoFromIssue, teamMembers, onSave, onCreateIssue }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: '',
    dueDate: ''
  });
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
    if (todo) {
      setFormData({
        title: todo.title || '',
        description: todo.description || '',
        assignedToId: todo.assigned_to_id || todo.assignee_id || todo.assignedToId || '',
        dueDate: todo.due_date ? todo.due_date.split('T')[0] : '' // Use date string directly, don't convert
      });
      
      // Load existing attachments
      if (todo.id) {
        loadAttachments(todo.id);
      }
    } else {
      // Clear all fields and set default due date for new todos
      setFormData({
        title: '',
        description: '',
        assignedToId: '',
        dueDate: getDateDaysFromNow(7)
      });
      setExistingAttachments([]);
    }
    setFiles([]);
  }, [todo]);

  // Clear form when dialog opens without a todo or set from issue
  useEffect(() => {
    if (open && !todo) {
      if (todoFromIssue) {
        // Pre-populate from issue
        setFormData({
          title: `Follow up: ${todoFromIssue.title}`,
          description: `Related to issue: ${todoFromIssue.title}`,
          assignedToId: todoFromIssue.owner_id || user?.id || '',
          dueDate: getDateDaysFromNow(7)
        });
      } else {
        // Clear form
        setFormData({
          title: '',
          description: '',
          assignedToId: '',
          dueDate: getDateDaysFromNow(7)
        });
      }
      setFiles([]);
      setExistingAttachments([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const savedTodo = await onSave(formData);
      
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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-2xl">
        <form onSubmit={handleSubmit}>
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
          
          <div className="space-y-6 py-6">
            {error && (
              <Alert className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter to-do title..."
                required
                className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
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

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3">
                <Label htmlFor="assignedTo" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned To
                </Label>
                <Select 
                  value={formData.assignedToId} 
                  onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 focus:border-blue-400 rounded-xl shadow-sm">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
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
            <div className="flex-1">
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
                    {todo ? 'Update' : 'Create'} To-Do
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TodoDialog;