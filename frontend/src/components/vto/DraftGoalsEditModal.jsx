import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const DraftGoalsEditModal = ({ isOpen, onClose, goals, year, onSave }) => {
  const [editedGoals, setEditedGoals] = useState([]);

  useEffect(() => {
    if (isOpen && goals) {
      setEditedGoals([...goals]);
    }
  }, [isOpen, goals]);

  const handleAddGoal = () => {
    setEditedGoals([...editedGoals, '']);
  };

  const handleUpdateGoal = (index, value) => {
    const updated = [...editedGoals];
    updated[index] = value;
    setEditedGoals(updated);
  };

  const handleDeleteGoal = (index) => {
    const updated = editedGoals.filter((_, i) => i !== index);
    setEditedGoals(updated);
  };

  const handleSave = () => {
    // Filter out empty goals
    const nonEmptyGoals = editedGoals.filter(goal => goal.trim() !== '');
    onSave(nonEmptyGoals);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Edit {year} Goals (Draft)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              These goals will be published to VTO on January 1, {year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {editedGoals.map((goal, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={goal}
                    onChange={(e) => handleUpdateGoal(index, e.target.value)}
                    placeholder={`Goal ${index + 1}`}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
                <button
                  onClick={() => handleDeleteGoal(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Delete goal"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Goal Button */}
          <button
            onClick={handleAddGoal}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus size={20} />
            Add Goal
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftGoalsEditModal;