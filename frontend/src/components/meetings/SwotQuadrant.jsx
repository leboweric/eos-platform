import React, { useState } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';

const SwotQuadrant = ({ 
  title, 
  subtitle, 
  icon, 
  items, 
  category,
  accentColor,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  isPresenting 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAdd = async () => {
    if (newItemText.trim()) {
      await onAddItem(category, newItemText.trim());
      setNewItemText('');
      setIsAdding(false);
    }
  };

  const handleUpdate = async (itemId) => {
    if (editText.trim()) {
      await onUpdateItem(itemId, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.content);
  };

  return (
    <div className="bg-white rounded-lg border-2 p-6 flex flex-col h-full" style={{ borderColor: accentColor }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ 
            backgroundColor: `${accentColor}15`,
            color: accentColor 
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 space-y-2 mb-4 min-h-[200px]">
        {items.length === 0 && !isAdding && (
          <p className="text-gray-400 italic text-sm">No items yet</p>
        )}
        
        {items.map((item) => (
          <div key={item.id} className="group flex items-start gap-2">
            <div className="flex-shrink-0 mt-1.5">
              <div 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            </div>
            
            {editingId === item.id ? (
              <div className="flex-1">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditText('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="flex-1 text-gray-800 text-sm leading-relaxed">{item.content}</p>
                {isPresenting && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add New Item Form */}
        {isAdding && (
          <div className="mt-3">
            <textarea
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder={`Add a ${category}...`}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewItemText('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Button */}
      {isPresenting && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ 
            color: accentColor,
            backgroundColor: `${accentColor}10`,
            border: `1px dashed ${accentColor}60`
          }}
        >
          <Plus size={16} />
          Add {title.slice(0, -1)}
        </button>
      )}
    </div>
  );
};

export default SwotQuadrant;