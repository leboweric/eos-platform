import React, { createContext, useContext, useState, useEffect } from 'react';
import { terminologyService } from '../services/terminologyService';
import { useAuthStore } from '../stores/authStore';

const TerminologyContext = createContext();

// Default terminology values
const defaultTerminology = {
  priorities_label: 'Quarterly Priorities',
  priority_singular: 'Priority',
  scorecard_label: 'Scorecard',
  issues_label: 'Issues',
  issue_singular: 'Issue',
  todos_label: 'To-Dos',
  todo_singular: 'To-Do',
  weekly_meeting_label: 'Weekly Accountability Meeting',
  quarterly_meeting_label: 'Quarterly Planning Meeting',
  long_term_vision_label: 'Long-term Vision (3 Years)',
  annual_goals_label: 'Annual Goals',
  business_blueprint_label: 'Business Blueprint',
  problem_solving_process: 'Issues & Problem Solving',
  quarter_label: 'Quarter',
  year_label: 'Year',
  organization_label: 'Organization',
  team_label: 'Team',
  department_label: 'Department'
};

export const TerminologyProvider = ({ children }) => {
  const [terminology, setTerminology] = useState(defaultTerminology);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();
  const orgId = user?.organization_id;
  
  // Debug logging
  console.log('TerminologyContext - User:', user);
  console.log('TerminologyContext - OrgId:', orgId);

  // Fetch terminology when org changes
  useEffect(() => {
    if (orgId) {
      fetchTerminology();
    } else {
      setTerminology(defaultTerminology);
      setLoading(false);
    }
  }, [orgId]);

  const fetchTerminology = async () => {
    if (!orgId) {
      console.error('No organization ID available');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await terminologyService.getTerminology(orgId);
      setTerminology(data || defaultTerminology);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch terminology:', err);
      setError(err.message);
      // Use defaults on error
      setTerminology(defaultTerminology);
    } finally {
      setLoading(false);
    }
  };

  const updateTerminology = async (updates) => {
    if (!orgId) {
      throw new Error('No organization ID available');
    }
    
    try {
      const data = await terminologyService.updateTerminology(orgId, updates);
      setTerminology(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to update terminology:', err);
      setError(err.message);
      throw err;
    }
  };

  const applyPreset = async (preset) => {
    if (!orgId) {
      throw new Error('No organization ID available');
    }
    
    try {
      const data = await terminologyService.applyPreset(orgId, preset);
      setTerminology(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to apply preset:', err);
      setError(err.message);
      throw err;
    }
  };

  const resetToDefaults = async () => {
    if (!orgId) {
      throw new Error('No organization ID available');
    }
    
    try {
      const data = await terminologyService.resetToDefaults(orgId);
      setTerminology(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to reset terminology:', err);
      setError(err.message);
      throw err;
    }
  };

  // Helper function to get a term with fallback
  const getTerm = (key) => {
    return terminology[key] || defaultTerminology[key] || key;
  };

  const value = {
    terminology,
    loading,
    error,
    updateTerminology,
    applyPreset,
    resetToDefaults,
    fetchTerminology,
    getTerm,
    // Convenience getters for common terms
    labels: {
      priorities: getTerm('priorities_label'),
      priority: getTerm('priority_singular'),
      scorecard: getTerm('scorecard_label'),
      issues: getTerm('issues_label'),
      issue: getTerm('issue_singular'),
      todos: getTerm('todos_label'),
      todo: getTerm('todo_singular'),
      weeklyMeeting: getTerm('weekly_meeting_label'),
      quarterlyMeeting: getTerm('quarterly_meeting_label'),
      longTermVision: getTerm('long_term_vision_label'),
      annualGoals: getTerm('annual_goals_label'),
      businessBlueprint: getTerm('business_blueprint_label'),
      problemSolving: getTerm('problem_solving_process'),
      quarter: getTerm('quarter_label'),
      year: getTerm('year_label'),
      organization: getTerm('organization_label'),
      team: getTerm('team_label'),
      department: getTerm('department_label')
    }
  };

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  );
};

// Hook to use terminology
export const useTerminology = () => {
  const context = useContext(TerminologyContext);
  if (!context) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }
  return context;
};