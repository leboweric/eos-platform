import React, { createContext, useContext, useState, useEffect } from 'react';

// Context for managing selected todos across the application
const SelectedTodosContext = createContext();

export const useSelectedTodos = () => {
  const context = useContext(SelectedTodosContext);
  if (!context) {
    throw new Error('useSelectedTodos must be used within a SelectedTodosProvider');
  }
  return context;
};

export const SelectedTodosProvider = ({ children }) => {
  // Initialize from localStorage if available
  const [selectedTodoIds, setSelectedTodoIds] = useState(() => {
    const saved = localStorage.getItem('selectedTodoIds');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    localStorage.setItem('selectedTodoIds', JSON.stringify(selectedTodoIds));
  }, [selectedTodoIds]);

  const toggleTodo = (todoId) => {
    setSelectedTodoIds(prev => {
      if (prev.includes(todoId)) {
        return prev.filter(id => id !== todoId);
      } else {
        return [...prev, todoId];
      }
    });
  };

  const isSelected = (todoId) => {
    return selectedTodoIds.includes(todoId);
  };

  const clearSelection = () => {
    setSelectedTodoIds([]);
  };

  const value = {
    selectedTodoIds,
    setSelectedTodoIds,
    toggleTodo,
    isSelected,
    clearSelection
  };

  return (
    <SelectedTodosContext.Provider value={value}>
      {children}
    </SelectedTodosContext.Provider>
  );
};