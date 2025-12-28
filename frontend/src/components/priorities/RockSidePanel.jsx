import React, { useState, useEffect, useRef } from 'react';
import { X, Archive, Trash2, Paperclip, Plus, Check, Calendar, ChevronDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, addDays } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';

function RockSidePanel({ 
  isOpen, 
  onClose, 
  rock, 
  teamId,
  onUpdate,
  onGenerateActionPlan,
  themeColors = { primary: '#3B82F6', secondary: '#1E40AF' }
}) {
  const { user } = useAuthStore();
  const [editedRock, setEditedRock] = useState(null);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const panelRef = useRef(null);

  // Initialize edited rock when rock prop changes
  useEffect(() => {
    if (rock) {
      setEditedRock({ ...rock });
    }
  }, [rock]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Auto-save with debounce
  function handleFieldChange(field, value) {
    const updated = { ...editedRock, [field]: value };
    setEditedRock(updated);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await quarterlyPrioritiesService.updatePriority(
          user?.organizationId,
          teamId,
          editedRock.id,
          { [field]: value }
        );
        onUpdate(updated);
      } catch (error) {
        console.error('Failed to auto-save:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce
  };

  // Add milestone
  async function handleAddMilestone() {
    if (newMilestone.title.trim()) {
      try {
        const milestone = await quarterlyPrioritiesService.createMilestone(
          user?.organizationId,
          teamId,
          editedRock.id,
          {
            title: newMilestone.title,
            dueDate: newMilestone.dueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd')
          }
        );
        
        const updatedRock = {
          ...editedRock,
          milestones: [...(editedRock.milestones || []), milestone]
        };
        setEditedRock(updatedRock);
        onUpdate(updatedRock);
        
        // Show success toast with milestone name
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
        toast.innerHTML = `
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Milestone "${milestone.title}" added successfully</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
        // Clear form but keep it open for adding more milestones
        setNewMilestone({ title: '', dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd') });
        // Focus back on title input for easy multiple additions
        setTimeout(() => {
          const titleInput = document.querySelector('input[placeholder="Milestone description..."]');
          if (titleInput) titleInput.focus();
        }, 100);
      } catch (error) {
        console.error('Failed to add milestone:', error);
        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = 'Failed to add milestone';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    }
  };

  // Toggle milestone completion
  async function handleToggleMilestone(milestone) {
    try {
      const newCompletedState = !milestone.completed;
      await quarterlyPrioritiesService.updateMilestone(
        user?.organizationId,
        teamId,
        editedRock.id,
        milestone.id,
        { completed: newCompletedState }
      );
      
      const updatedRock = {
        ...editedRock,
        milestones: editedRock.milestones.map(m =>
          m.id === milestone.id ? { ...m, completed: newCompletedState } : m
        )
      };
      setEditedRock(updatedRock);
      onUpdate(updatedRock);
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  // Delete milestone
  async function handleDeleteMilestone(milestone) {
    try {
      await quarterlyPrioritiesService.deleteMilestone(
        user?.organizationId,
        teamId,
        editedRock.id,
        milestone.id
      );
      
      const updatedRock = {
        ...editedRock,
        milestones: editedRock.milestones.filter(m => m.id !== milestone.id)
      };
      setEditedRock(updatedRock);
      onUpdate(updatedRock);
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  // Add comment/update
  async function handleAddComment() {
    if (comment.trim()) {
      try {
        await quarterlyPrioritiesService.addPriorityUpdate(
          user?.organizationId,
          teamId,
          editedRock.id,
          comment,
          null // No status change
        );
        
        const newUpdate = {
          content: comment,
          author: user?.name || 'You',
          createdAt: new Date().toISOString()
        };
        
        const updatedRock = {
          ...editedRock,
          updates: [newUpdate, ...(editedRock.updates || [])]
        };
        setEditedRock(updatedRock);
        onUpdate(updatedRock);
        setComment('');
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
  };

  if (!isOpen || !editedRock) return null;

  const completedMilestones = (editedRock.milestones || []).filter(m => m.completed).length;
  const totalMilestones = (editedRock.milestones || []).length;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        ref={panelRef}
        className={`fixed right-0 top-0 h-full bg-white shadow-2xl pointer-events-auto transform transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '40%', minWidth: '500px', maxWidth: '700px' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={editedRock.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="flex-1 text-xl font-semibold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 -ml-2"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-4"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {isSaving && (
            <div className="text-xs text-gray-500 mt-1">Saving...</div>
          )}
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-gray-50"
               style={{ 
                 borderColor: editedRock.status === 'off-track' ? '#EF4444' : 
                             editedRock.status === 'complete' ? themeColors.primary : '#10B981'
               }}>
            <div className="w-3 h-3 rounded-full"
                 style={{ 
                   backgroundColor: editedRock.status === 'off-track' ? '#EF4444' : 
                                   editedRock.status === 'complete' ? themeColors.primary : '#10B981'
                 }} />
            <span className="text-sm font-medium">
              {editedRock.status === 'off-track' ? 'Off Track' : 
               editedRock.status === 'complete' ? 'Complete' : 'On Track'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </div>
          <Button variant="ghost" size="sm">
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
          {onGenerateActionPlan && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onGenerateActionPlan(rock)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              Action Plan
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 180px)' }}>
          {/* Core Details */}
          <div className="px-6 py-4 space-y-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Owner</label>
                <select 
                  value={editedRock.ownerId || ''}
                  onChange={(e) => handleFieldChange('ownerId', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select owner...</option>
                  {/* TODO: Add team members list */}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <div className="mt-1 relative">
                  <input
                    value={editedRock.dueDate || ''}
                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Progress</label>
                <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Description */}
          <div className="px-6 py-4 border-b border-gray-200">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={editedRock.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Add a description..."
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
            />
          </div>

          {/* Milestones */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Milestones ({completedMilestones}/{totalMilestones})
              </h3>
              {!isAddingMilestone && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingMilestone(true);
                    setNewMilestone({ 
                      title: '', 
                      dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd') 
                    });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {(editedRock.milestones || []).map((milestone) => (
                <div key={milestone.id} className="flex items-start gap-3 group">
                  <div 
                    className="mt-1 w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                    style={{
                      borderColor: milestone.completed ? themeColors.primary : '#CBD5E1',
                      backgroundColor: milestone.completed ? themeColors.primary : 'white'
                    }}
                    onClick={() => handleToggleMilestone(milestone)}
                  >
                    {milestone.completed && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${milestone.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {milestone.title}
                    </p>
                    {milestone.dueDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMilestone(milestone)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                    title="Delete milestone"
                  >
                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                  </button>
                </div>
              ))}
              
              {isAddingMilestone && (
                <div className="space-y-2 pt-2">
                  <input
                    type="text"
                    placeholder="Milestone description..."
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddMilestone();
                      if (e.key === 'Escape') {
                        setIsAddingMilestone(false);
                        setNewMilestone({ title: '', dueDate: '' });
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleAddMilestone}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingMilestone(false);
                        setNewMilestone({ title: '', dueDate: '' });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity & Updates */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Activity & Updates</h3>
            <div className="space-y-3">
              {(editedRock.updates || []).slice(0, 5).map((update, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium">{update.author}</span>
                    <span>•</span>
                    <span>{format(new Date(update.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-gray-700 mt-1">{update.content}</p>
                </div>
              ))}
              {(!editedRock.updates || editedRock.updates.length === 0) && (
                <p className="text-sm text-gray-500 italic">No updates yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Comment Box (Sticky Bottom) */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment or update..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button onClick={handleAddComment} disabled={!comment.trim()}>
              Post Update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RockSidePanel;