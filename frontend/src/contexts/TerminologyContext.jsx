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
  business_blueprint_label: '2-Page Plan',
  accountability_chart_label: 'Organizational Chart',
  milestones_label: 'Milestones',
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
      // Primary labels (used in code with these names)
      priorities_label: getTerm('priorities_label'),
      priority_singular: getTerm('priority_singular'),
      scorecard_label: getTerm('scorecard_label'),
      issues_label: getTerm('issues_label'),
      issue_singular: getTerm('issue_singular'),
      todos_label: getTerm('todos_label'),
      todo_singular: getTerm('todo_singular'),
      weekly_meeting_label: getTerm('weekly_meeting_label'),
      quarterly_meeting_label: getTerm('quarterly_meeting_label'),
      long_term_vision_label: getTerm('long_term_vision_label'),
      annual_goals_label: getTerm('annual_goals_label'),
      business_blueprint_label: getTerm('business_blueprint_label'),
      accountability_chart_label: getTerm('accountability_chart_label'),
      milestones_label: getTerm('milestones_label'),
      problem_solving_process: getTerm('problem_solving_process'),
      quarter_label: getTerm('quarter_label'),
      year_label: getTerm('year_label'),
      organization_label: getTerm('organization_label'),
      team_label: getTerm('team_label'),
      department_label: getTerm('department_label'),
      
      // Shortened aliases for backward compatibility
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
      accountabilityChart: getTerm('accountability_chart_label'),
      milestones: getTerm('milestones_label'),
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