import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Users, Lock, AlertCircle } from 'lucide-react';

const CreateFolderDialog = ({ 
  open, 
  onClose, 
  onCreateFolder, 
  parentFolder,
  departments,
  isAdmin,
  userId 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    visibility: 'personal',
    departmentId: ''
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('Folder name is required');
      return;
    }

    if (formData.visibility === 'department' && !formData.departmentId) {
      setError('Please select a department');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      await onCreateFolder({
        name: formData.name.trim(),
        visibility: formData.visibility,
        departmentId: formData.visibility === 'department' ? formData.departmentId : null,
        parentFolderId: parentFolder?.id || null
      });
      
      // Reset form and close
      setFormData({
        name: '',
        visibility: 'personal',
        departmentId: ''
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      visibility: 'personal',
      departmentId: ''
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            {parentFolder ? 
              `Creating a subfolder in "${parentFolder.name}"` : 
              'Create a new folder to organize your documents'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>

          {isAdmin && (
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4" />
                      Company - Visible to all users
                    </div>
                  </SelectItem>
                  <SelectItem value="department">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Department - Visible to team members
                    </div>
                  </SelectItem>
                  <SelectItem value="personal">
                    <div className="flex items-center">
                      <Lock className="mr-2 h-4 w-4" />
                      Personal - Private to you
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.visibility === 'department' && (
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isAdmin && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                As a regular user, you can only create personal folders that are private to you.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !formData.name.trim()}>
            {creating ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;