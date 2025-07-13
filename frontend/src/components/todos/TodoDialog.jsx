import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Calendar, User, Paperclip, X, Download } from 'lucide-react';
import { todosService } from '../../services/todosService';
import { useAuthStore } from '../../stores/authStore';

const TodoDialog = ({ open, onOpenChange, todo, teamMembers, onSave }) => {
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

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title || '',
        description: todo.description || '',
        assignedToId: todo.assigned_to_id || todo.assignee_id || '',
        dueDate: todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : ''
      });
      
      // Load existing attachments
      if (todo.id) {
        loadAttachments(todo.id);
      }
    } else {
      // Default due date to 7 days from now for new todos
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 7);
      setFormData(prev => ({
        ...prev,
        dueDate: defaultDueDate.toISOString().split('T')[0]
      }));
    }
  }, [todo]);

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
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{todo ? 'Edit To-Do' : 'Create To-Do'}</DialogTitle>
            <DialogDescription>
              {todo ? 'Update the to-do details below' : 'Create a new to-do item with automatic 7-day due date'}
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
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter to-do title..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide additional details..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">
                  <User className="inline-block h-4 w-4 mr-1" />
                  Assigned To
                </Label>
                <Select 
                  value={formData.assignedToId} 
                  onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">
                <Calendar className="inline-block h-4 w-4 mr-1" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">Defaults to 7 days from creation</p>
            </div>

            {/* Attachments section */}
            <div className="space-y-2">
              <Label>
                <Paperclip className="inline-block h-4 w-4 mr-1" />
                Attachments
              </Label>
              
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  {existingAttachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await todosService.downloadAttachment(todo.id, attachment.id, attachment.file_name);
                            } catch (error) {
                              setError('Failed to download attachment');
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
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">{file.name} (new)</span>
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
              
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">Max file size: 10MB</p>
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
                  {todo ? 'Update' : 'Create'} To-Do
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TodoDialog;