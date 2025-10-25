import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Circle, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Calendar,
  AlertCircle 
} from 'lucide-react';

/**
 * Component for displaying and editing milestones
 * Allows inline editing of milestone text and dates without needing to expand the card
 */
export const EditableMilestones = ({ 
  milestones = [], 
  isEditing,
  onUpdateMilestone,
  onDeleteMilestone,
  onCreateMilestone,
  priorityId,
  formatDate,
  getDaysUntilDue 
}) => {
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });

  const handleEditMilestone = (milestone) => {
    setEditingMilestoneId(milestone.id);
    setMilestoneForm({
      title: milestone.title,
      dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveMilestone = async (milestoneId) => {
    await onUpdateMilestone(priorityId, milestoneId, {
      title: milestoneForm.title,
      dueDate: milestoneForm.dueDate
    });
    setEditingMilestoneId(null);
    setMilestoneForm({ title: '', dueDate: '' });
  };

  const handleAddMilestone = async () => {
    if (newMilestone.title) {
      await onCreateMilestone(priorityId, newMilestone);
      setNewMilestone({ title: '', dueDate: '' });
      setShowAddForm(false);
    }
  };

  const handleToggleComplete = async (milestone) => {
    await onUpdateMilestone(priorityId, milestone.id, {
      ...milestone,
      completed: !milestone.completed
    });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm text-gray-600">Milestones</Label>
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      
      <div className="space-y-2 bg-gray-50 p-2 rounded">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="flex items-center space-x-2 group">
            {/* Checkbox */}
            <button
              onClick={() => handleToggleComplete(milestone)}
              className="flex-shrink-0"
            >
              {milestone.completed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>

            {editingMilestoneId === milestone.id ? (
              // Edit mode for this milestone
              <>
                <Input
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="flex-1 h-7 text-sm"
                  placeholder="Milestone title"
                />
                <Input
                  type="date"
                  value={milestoneForm.dueDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                  className="w-44 h-7 text-sm shrink-0"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => handleSaveMilestone(milestone.id)}
                >
                  <Check className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setEditingMilestoneId(null);
                    setMilestoneForm({ title: '', dueDate: '' });
                  }}
                >
                  <X className="h-3 w-3 text-gray-600" />
                </Button>
              </>
            ) : (
              // Display mode
              <>
                <span className={`flex-1 text-sm ${milestone.completed ? 'line-through text-gray-400' : ''}`}>
                  {milestone.title}
                </span>
                
                {/* Due date with urgency indicator */}
                {milestone.dueDate && (
                  <span className={`text-xs flex items-center space-x-1 ${
                    !milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 
                      ? 'text-red-600' 
                      : !milestone.completed && getDaysUntilDue(milestone.dueDate) <= 3 
                      ? 'text-orange-600' 
                      : 'text-gray-500'
                  }`}>
                    {!milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 && (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(milestone.dueDate)}</span>
                  </span>
                )}

                {/* Edit/Delete buttons - only show when in editing mode */}
                {isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEditMilestone(milestone)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onDeleteMilestone(priorityId, milestone.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add new milestone form */}
        {showAddForm && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <Input
              value={newMilestone.title}
              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              className="flex-1 h-7 text-sm"
              placeholder="New milestone title"
              autoFocus
            />
            <Input
              type="date"
              value={newMilestone.dueDate}
              onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
              className="w-44 h-7 text-sm shrink-0"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handleAddMilestone}
            >
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => {
                setShowAddForm(false);
                setNewMilestone({ title: '', dueDate: '' });
              }}
            >
              <X className="h-3 w-3 text-gray-600" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableMilestones;