import React, { createContext, useContext, useState, useEffect } from 'react';
import { todoSelectionService } from '../services/userPreferencesService';
import { useAuthStore } from '../stores/authStore';

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
  const { isAuthenticated } = useAuthStore();
  const [selectedTodoIds, setSelectedTodoIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load selected todos from database when component mounts and user is authenticated
  useEffect(() => {
    const loadSelectedTodos = async () => {
      if (!isAuthenticated) {
        setSelectedTodoIds([]);
        setIsLoading(false);
        return;
      }

      try {
        const savedIds = await todoSelectionService.getSelectedTodos();
        setSelectedTodoIds(savedIds || []);
      } catch (error) {
        console.error('Failed to load selected todos:', error);
        // If loading fails, start with empty selection
        setSelectedTodoIds([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSelectedTodos();
  }, [isAuthenticated]);

  // Save to database whenever selection changes (debounced)
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const saveTimeout = setTimeout(async () => {
      try {
        if (selectedTodoIds.length > 0) {
          await todoSelectionService.setSelectedTodos(selectedTodoIds);
        } else {
          // Clear from database if no todos selected
          await todoSelectionService.clearSelectedTodos();
        }
      } catch (error) {
        console.error('Failed to save selected todos:', error);
      }
    }, 500); // Debounce by 500ms to avoid too many API calls

    return () => clearTimeout(saveTimeout);
  }, [selectedTodoIds, isAuthenticated, isLoading]);

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
    clearSelection,
    isLoading
  };

  return (
    <SelectedTodosContext.Provider value={value}>
      {children}
    </SelectedTodosContext.Provider>
  );
};