import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Calendar } from 'lucide-react';

/**
 * Component for rendering editable owner and date fields in priority cards
 * This ensures these fields are always editable when in edit mode,
 * regardless of whether the card is expanded or not
 */
export const EditablePriorityFields = ({ 
  isEditing, 
  editForm, 
  setEditForm, 
  priority,
  teamMembers = [],
  formatDate,
  getDaysUntilDue,
  getUserInitials 
}) => {
  if (!isEditing) {
    // Read-only display
    return (
      <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-gray-50 rounded">
        <div>
          <Label className="text-xs text-gray-600">Owner</Label>
          <div className="text-sm font-medium mt-1">{priority.owner?.name || 'Unassigned'}</div>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Due Date</Label>
          <div className="flex items-center space-x-1 mt-1">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-sm">{formatDate(priority.dueDate)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Editable fields
  return (
    <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
      <div>
        <Label className="text-xs text-gray-600">Owner</Label>
        <Select
          value={editForm.ownerId}
          onValueChange={(value) => setEditForm({ ...editForm, ownerId: value })}
        >
          <SelectTrigger className="h-8 mt-1">
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.filter(member => member.id).map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-600">Due Date</Label>
        <DatePicker placeholder="Select date" 
          value={editForm.dueDate}
          onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
          className="h-8 mt-1"
        />
      </div>
    </div>
  );
};

export default EditablePriorityFields;