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
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Plus, 
  X, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const EditPositionDialog = ({ open, onClose, onSave, position, skills }) => {
  const [formData, setFormData] = useState({
    title: '',
    positionType: 'individual_contributor',
    responsibilities: []
  });
  const [newResponsibility, setNewResponsibility] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (position) {
      console.log('EditPositionDialog received position:', position.title, 'ID:', position.id, 'Full position:', position);
      setFormData({
        title: position.title || '',
        positionType: position.position_type || 'individual_contributor',
        responsibilities: position.responsibilities?.map(r => ({
          id: r.id,
          responsibility: r.responsibility,
          priority: r.priority || 'medium'
        })) || []
      });
    }
  }, [position]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Seat title is required';
    }
    
    if (formData.responsibilities.length < 1) {
      errors.responsibilities = 'Please add at least 1 role/responsibility';
    } else if (formData.responsibilities.length > 7) {
      errors.responsibilities = 'Maximum 7 roles/responsibilities allowed';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddResponsibility = () => {
    if (!newResponsibility.trim()) return;
    
    if (formData.responsibilities.length >= 7) {
      setValidationErrors({ 
        ...validationErrors, 
        responsibilities: 'Maximum 7 roles/responsibilities allowed' 
      });
      return;
    }
    
    setFormData({
      ...formData,
      responsibilities: [...formData.responsibilities, {
        responsibility: newResponsibility.trim(),
        priority: 'medium'
      }]
    });
    setNewResponsibility('');
    
    // Clear validation error if we now have enough responsibilities
    if (formData.responsibilities.length >= 0) {
      setValidationErrors({ ...validationErrors, responsibilities: null });
    }
  };

  const handleRemoveResponsibility = (index) => {
    setFormData({
      ...formData,
      responsibilities: formData.responsibilities.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        responsibilities: formData.responsibilities.map((r, index) => ({
          responsibility: r.responsibility,
          priority: r.priority,
          sort_order: index
        }))
      });
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save seat');
    } finally {
      setLoading(false);
    }
  };

  const getResponsibilityCountColor = () => {
    const count = formData.responsibilities.length;
    if (count < 1) return 'text-red-600';
    if (count > 7) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {position ? 'Edit Seat' : 'Create Seat'}
            </DialogTitle>
            <DialogDescription>
              Define the seat and its accountabilities. Each seat should have 1-7 clear roles/responsibilities.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">
                Seat Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Chief Executive Officer"
                className={validationErrors.title ? 'border-red-500' : ''}
              />
              {validationErrors.title && (
                <p className="text-sm text-red-500">{validationErrors.title}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Seat Type</Label>
              <Select
                value={formData.positionType}
                onValueChange={(value) => setFormData({ ...formData, positionType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="individual_contributor">Individual Contributor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>
                  Roles & Responsibilities <span className="text-red-500">*</span>
                </Label>
                <span className={`text-sm font-medium ${getResponsibilityCountColor()}`}>
                  {formData.responsibilities.length}/7 
                  {formData.responsibilities.length < 1 && ' (min 1 required)'}
                </span>
              </div>
              
              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-blue-800">
                    Each seat must have <strong>1-7 clear accountabilities</strong>. These are the key roles and responsibilities that this seat owns.
                  </div>
                </div>
              </div>

              {/* Existing responsibilities */}
              {formData.responsibilities.length > 0 && (
                <div className="space-y-2">
                  {formData.responsibilities.map((resp, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-2">•</span>
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                        {resp.responsibility}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveResponsibility(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new responsibility */}
              {formData.responsibilities.length < 7 && (
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter a role or responsibility..."
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddResponsibility();
                      }
                    }}
                    className={validationErrors.responsibilities && formData.responsibilities.length < 1 ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    onClick={handleAddResponsibility}
                    disabled={!newResponsibility.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {validationErrors.responsibilities && (
                <p className="text-sm text-red-500">{validationErrors.responsibilities}</p>
              )}

              {/* Progress indicator */}
              <div className="flex items-center space-x-2 mt-2">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div
                    key={num}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      formData.responsibilities.length >= num
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.responsibilities.length < 1}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Seat
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPositionDialog;