import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link, Navigate } from 'react-router-dom';
import { businessBlueprintService } from '../services/businessBlueprintService';
import { organizationService } from '../services/organizationService';
import annualPlanningGoalsService from '../services/annualPlanningGoalsService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { getRevenueLabel, getRevenueLabelWithSuffix, formatCurrency } from '../utils/revenueUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import { useTerminology } from '../contexts/TerminologyContext';
import '../styles/print.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import CoreValueDialog from '../components/vto/CoreValueDialog';
import ThreeYearPictureDialog from '../components/vto/ThreeYearPictureDialog';
import OneYearPlanDialog from '../components/vto/OneYearPlanDialog';
import TwoPagePlanView from '../components/vto/TwoPagePlanView';
import DraftGoalsEditModal from '../components/vto/DraftGoalsEditModal';
import { 
  Target, 
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Lightbulb,
  Users,
  TrendingUp,
  Calendar,
  Edit,
  DollarSign,
  BarChart3,
  Eye,
  CheckCircle2,
  ArrowRight,
  Flag,
  User,
  CheckSquare,
  Clock,
  Building2,
  MessageSquare,
  FileText,
  PenTool,
  Download
} from 'lucide-react';

const BusinessBlueprintPage = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { labels } = useTerminology();
  
  // Determine framework mode
  const isEOS = labels.priorities_label === 'Rocks';
  const isOKR = labels.priorities_label === 'Objectives';
  const isScalingUp = labels.business_blueprint_label === 'One-Page Strategic Plan';
  const is4DX = labels.priorities_label?.includes('WIG');
  
  // Get framework-specific tab labels
  const getTabLabels = () => {
    if (isEOS) {
      return { vision: 'Vision', execution: 'Traction' };
    }
    return { vision: 'Vision', execution: 'Execution' };
  };
  
  const tabLabels = getTabLabels();
  
  // Get framework-specific section labels and descriptions
  const getFrameworkSections = () => {    
    if (isEOS) {
      return {
        coreValues: { label: 'Core Values', description: '3-7 rules that define your culture and Right People' },
        coreFocus: { 
          label: 'Core Focus', 
          description: 'Your Purpose/Cause/Passion and your Niche',
          purposeLabel: 'Purpose/Cause/Passion',
          nicheLabel: 'Niche'
        },
        tenYearTarget: { label: '10-Year Target', description: 'Where do you want your organization to be in 10 years?' },
        marketingStrategy: { 
          label: 'Marketing Strategy', 
          description: 'Target Market, 3 Uniques, and Proven Process',
          targetMarketLabel: 'Target Market',
          differentiatorsLabel: '3 Uniques',
          provenProcessLabel: 'Proven Process'
        },
        threeYearPicture: { label: '3-Year Picture', description: 'What does the organization look like in 3 years?' },
        oneYearPlan: { label: '1-Year Plan', description: 'What must be accomplished this year?' }
      };
    } else if (isOKR) {
      return {
        coreValues: { label: 'Mission & Values', description: 'Why we exist and how we behave' },
        coreFocus: { 
          label: 'Vision Statement', 
          description: 'Where we are going and what success looks like',
          purposeLabel: 'Mission',
          nicheLabel: 'Strategic Focus'
        },
        tenYearTarget: { label: 'Long-term Vision', description: 'Our audacious 10-year goal' },
        marketingStrategy: { 
          label: 'Strategic Themes', 
          description: 'Key areas of focus and differentiation',
          targetMarketLabel: 'Target Segments',
          differentiatorsLabel: 'Key Differentiators',
          provenProcessLabel: 'Value Proposition'
        },
        threeYearPicture: { label: '3-Year Strategic Goals', description: 'Mid-term objectives and key results' },
        oneYearPlan: { label: 'Annual OKRs', description: 'This year\'s objectives and measurable results' }
      };
    } else if (isScalingUp) {
      return {
        coreValues: { label: 'Core Values & Purpose', description: 'Why we exist and our fundamental beliefs' },
        coreFocus: { 
          label: 'Core Competencies', 
          description: 'What we do better than anyone else',
          purposeLabel: 'Core Purpose',
          nicheLabel: 'Core Competencies'
        },
        tenYearTarget: { label: 'BHAG (10-25 Years)', description: 'Big Hairy Audacious Goal' },
        marketingStrategy: { 
          label: 'Brand Promises', 
          description: 'What customers can always expect from us',
          targetMarketLabel: 'Target Customers',
          differentiatorsLabel: 'Brand Promises',
          provenProcessLabel: 'Value Discipline'
        },
        threeYearPicture: { label: '3-5 Year Targets', description: 'Key metrics and milestones' },
        oneYearPlan: { label: 'Annual Priorities & Goals', description: 'This year\'s critical priorities' }
      };
    } else if (is4DX) {
      return {
        coreValues: { label: 'Team Values', description: 'Principles that guide our execution' },
        coreFocus: { 
          label: 'Mission Focus', 
          description: 'What we must achieve above all else',
          purposeLabel: 'Mission',
          nicheLabel: 'Focus Area'
        },
        tenYearTarget: { label: 'Ultimate Goal', description: 'From X to Y by when (long-term)' },
        marketingStrategy: { 
          label: 'Strategy Map', 
          description: 'How we will win in our market',
          targetMarketLabel: 'Target Audience',
          differentiatorsLabel: 'Strategic Advantages',
          provenProcessLabel: 'Execution Method'
        },
        threeYearPicture: { label: '3-Year Milestones', description: 'Critical waypoints to our ultimate goal' },
        oneYearPlan: { label: 'Annual WIGs', description: 'This year\'s Wildly Important Goals' }
      };
    } else {
      // Default/generic labels
      return {
        coreValues: { label: 'Core Values', description: 'The fundamental beliefs of your organization' },
        coreFocus: { 
          label: 'Core Focus', 
          description: 'Your organization\'s purpose and focus area',
          purposeLabel: 'Purpose',
          nicheLabel: 'Focus Area'
        },
        tenYearTarget: { label: '10-Year Vision', description: 'Long-term organizational goals' },
        marketingStrategy: { 
          label: 'Strategy', 
          description: 'How you will succeed in your market',
          targetMarketLabel: 'Target Market',
          differentiatorsLabel: 'Key Differentiators',
          provenProcessLabel: 'Approach'
        },
        threeYearPicture: { label: '3-Year Goals', description: 'Mid-term objectives' },
        oneYearPlan: { label: 'Annual Plan', description: 'This year\'s priorities and goals' }
      };
    }
  };
  
  const frameworkSections = getFrameworkSections();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('vision');
  const [viewMode, setViewMode] = useState(true); // Default to view mode for cleaner presentation
  const [organization, setOrganization] = useState(null);
  
  // Check if viewing department-level plan
  const isDepartmentView = selectedDepartment && !selectedDepartment.is_leadership_team;
  
  // Business Blueprint data
  const [blueprintData, setBlueprintData] = useState({
    coreValues: [],
    coreFocus: {
      purpose: '',
      cause: '',
      passion: '',
      niche: '',
      hedgehogType: 'purpose'
    },
    bhag: {
      description: '',
      year: new Date().getFullYear() + 10,
      runningTotal: ''
    },
    marketingStrategy: {
      targetMarket: '',
      demographicProfile: '',
      geographicProfile: '',
      psychographicProfile: '',
      differentiators: ['', '', ''],
      provenProcessExists: false,
      guaranteeExists: false,
      guaranteeDescription: ''
    },
    threeYearPicture: null,
    oneYearPlan: null,
    quarterlyPriorities: null,
    longTermIssues: []
  });

  // New core value form
  const [newCoreValue, setNewCoreValue] = useState({ value: '', description: '' });
  const [editingCoreValue, setEditingCoreValue] = useState(null);
  const [showCoreValueDialog, setShowCoreValueDialog] = useState(false);
  
  // Dialog states for planning sections
  const [showThreeYearDialog, setShowThreeYearDialog] = useState(false);
  const [showOneYearDialog, setShowOneYearDialog] = useState(false);
  
  // Draft goals state for Annual Planning
  const [draftGoals, setDraftGoals] = useState(null);
  const [showDraftGoalsModal, setShowDraftGoalsModal] = useState(false);
  
  // State for editing Core Focus
  const [editingCoreFocus, setEditingCoreFocus] = useState(false);
  const [editingBHAG, setEditingBHAG] = useState(false);
  
  // State for organization theme colors
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  // State for tracking checked items in Long-term Vision and Annual Goals
  const [lookLikeCheckedItems, setLookLikeCheckedItems] = useState({});
  const [oneYearGoalsCheckedItems, setOneYearGoalsCheckedItems] = useState({});
  const [editingMarketingStrategy, setEditingMarketingStrategy] = useState(false);

  // Fetch data on mount and when department changes
  useEffect(() => {
    fetchBusinessBlueprint();
    fetchOrganization();
    fetchOrganizationTheme();
    fetchDraftGoals();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [selectedDepartment?.id]); // Re-fetch when department ID changes
  
  // Hide sidebar if coming from meeting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromMeeting = urlParams.get('fromMeeting') === 'true';
    
    if (fromMeeting) {
      // Set a flag in sessionStorage to hide sidebar
      sessionStorage.setItem('hideSidebarTemp', 'true');
    }
    
    // Clean up when leaving the page
    return () => {
      if (fromMeeting) {
        sessionStorage.removeItem('hideSidebarTemp');
      }
    };
  }, []);

  const fetchBusinessBlueprint = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessBlueprintService.getBusinessBlueprint();
      
      // Set completion states from database
      if (data.threeYearPicture?.what_does_it_look_like_completions) {
        setLookLikeCheckedItems(data.threeYearPicture.what_does_it_look_like_completions);
      }
      
      if (data.oneYearPlan?.goals) {
        const goalsCompletionState = {};
        data.oneYearPlan.goals.forEach((goal, index) => {
          if (goal.is_completed) {
            goalsCompletionState[index] = true;
          }
        });
        setOneYearGoalsCheckedItems(goalsCompletionState);
      }
      
      // Transform API data to component state
      setBlueprintData({
        coreValues: data.coreValues || [],
        coreFocus: {
          purpose: data.coreFocus?.hedgehog_type === 'purpose' ? (data.coreFocus?.purpose_cause_passion || '') : '',
          cause: data.coreFocus?.hedgehog_type === 'cause' ? (data.coreFocus?.purpose_cause_passion || '') : '',
          passion: data.coreFocus?.hedgehog_type === 'passion' ? (data.coreFocus?.purpose_cause_passion || '') : '',
          niche: data.coreFocus?.niche || '',
          hedgehogType: data.coreFocus?.hedgehog_type || 'purpose'
        },
        bhag: {
          description: data.tenYearTarget?.target_description || '',
          year: data.tenYearTarget?.target_year || new Date().getFullYear() + 10,
          runningTotal: data.tenYearTarget?.running_total_description || ''
        },
        marketingStrategy: {
          targetMarket: data.marketingStrategy?.target_market || '',
          demographicProfile: data.marketingStrategy?.demographic_profile || '',
          geographicProfile: data.marketingStrategy?.geographic_profile || '',
          psychographicProfile: data.marketingStrategy?.psychographic_profile || '',
          differentiators: [
            data.marketingStrategy?.differentiator_1 || '',
            data.marketingStrategy?.differentiator_2 || '',
            data.marketingStrategy?.differentiator_3 || '',
            data.marketingStrategy?.differentiator_4 || '',
            data.marketingStrategy?.differentiator_5 || ''
          ].filter((d, index) => index < 3 || d), // Keep first 3 always, then only non-empty ones
          provenProcessExists: data.marketingStrategy?.proven_process_exists || false,
          guaranteeExists: data.marketingStrategy?.guarantee_exists || false,
          guaranteeDescription: data.marketingStrategy?.guarantee_description || ''
        },
        threeYearPicture: data.threeYearPicture ? {
          ...data.threeYearPicture,
          lookLikeItems: data.threeYearPicture.what_does_it_look_like ? 
            JSON.parse(data.threeYearPicture.what_does_it_look_like) : [],
          completions: data.threeYearPicture.what_does_it_look_like_completions || {}
        } : null,
        oneYearPlan: data.oneYearPlan ? {
          ...data.oneYearPlan,
          goals: data.oneYearPlan.goals && Array.isArray(data.oneYearPlan.goals) ? 
            data.oneYearPlan.goals : []
        } : null,
        quarterlyPriorities: data.quarterlyPriorities,
        longTermIssues: data.longTermIssues || []
      });
    } catch (error) {
      console.error('Failed to fetch business blueprint:', error);
      setError('Failed to load business blueprint data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const orgData = await organizationService.getOrganization();
      setOrganization(orgData);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  };

  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      // Use default colors on error
    }
  };

  // Core Values handlers
  const handleAddCoreValue = () => {
    setEditingCoreValue(null);
    setShowCoreValueDialog(true);
  };

  const handleSaveNewCoreValue = async (newValue) => {
    try {
      setSaving(true);
      setError(null);
      const savedValue = await businessBlueprintService.upsertCoreValue(newValue);
      setBlueprintData(prev => ({
        ...prev,
        coreValues: [...prev.coreValues, savedValue]
      }));
      setSuccess('Core value added successfully');
    } catch (error) {
      setError('Failed to add core value');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoreValue = async (valueId) => {
    try {
      setSaving(true);
      setError(null);
      await businessBlueprintService.deleteCoreValue(valueId);
      setBlueprintData(prev => ({
        ...prev,
        coreValues: prev.coreValues.filter(v => v.id !== valueId)
      }));
      setSuccess('Core value deleted successfully');
    } catch (error) {
      setError('Failed to delete core value');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCoreValue = (value) => {
    setEditingCoreValue(value);
    setShowCoreValueDialog(true);
  };

  const handleSaveCoreValue = async (updatedValue) => {
    try {
      setSaving(true);
      setError(null);
      const savedValue = await businessBlueprintService.upsertCoreValue(updatedValue);
      setBlueprintData(prev => ({
        ...prev,
        coreValues: prev.coreValues.map(v => v.id === savedValue.id ? savedValue : v)
      }));
      setEditingCoreValue(null);
      setSuccess('Core value updated successfully');
    } catch (error) {
      setError('Failed to update core value');
    } finally {
      setSaving(false);
    }
  };

  // Core Focus (Hedgehog) handler
  const handleSaveCoreFocus = async () => {
    try {
      setSaving(true);
      setError(null);
      // Backend expects 'purpose' field regardless of hedgehog type
      const { hedgehogType, niche, purpose, cause, passion } = blueprintData.coreFocus;
      const purposeValue = hedgehogType === 'purpose' ? purpose : 
                          hedgehogType === 'cause' ? cause : passion;
      
      await businessBlueprintService.updateCoreFocus({
        purpose: purposeValue,
        niche,
        hedgehogType
      });
      setSuccess('Focus updated successfully');
    } catch (error) {
      setError('Failed to update Focus');
    } finally {
      setSaving(false);
    }
  };

  // BHAG handler
  const handleSaveBHAG = async () => {
    try {
      setSaving(true);
      setError(null);
      await businessBlueprintService.updateBHAG(blueprintData.bhag);
      setSuccess('Long Range Plan updated successfully');
    } catch (error) {
      setError('Failed to update Long Range Plan');
    } finally {
      setSaving(false);
    }
  };

  // Marketing Strategy handler
  const handleSaveMarketingStrategy = async () => {
    try {
      setSaving(true);
      setError(null);
      // Convert array to individual fields for backend
      const { targetMarket, demographicProfile, geographicProfile, psychographicProfile, 
              differentiators, provenProcessExists, guaranteeExists, guaranteeDescription } = blueprintData.marketingStrategy;
      const strategyData = {
        targetMarket,
        demographicProfile,
        geographicProfile,
        psychographicProfile,
        differentiator1: differentiators[0] || '',
        differentiator2: differentiators[1] || '',
        differentiator3: differentiators[2] || '',
        // Backend doesn't support 4th and 5th differentiators yet, but we'll send them anyway
        differentiator4: differentiators[3] || '',
        differentiator5: differentiators[4] || '',
        provenProcessExists,
        guaranteeExists,
        guaranteeDescription
      };
      await businessBlueprintService.updateMarketingStrategy(strategyData);
      setSuccess('Marketing strategy updated successfully');
    } catch (error) {
      setError('Failed to update marketing strategy');
    } finally {
      setSaving(false);
    }
  };

  // Three Year Picture handler
  const handleSaveThreeYearPicture = async (data) => {
    try {
      setSaving(true);
      setError(null);
      const savedData = await businessBlueprintService.updateThreeYearPicture(data);
      
      // Transform the saved data to match frontend structure
      const transformedData = savedData ? {
        ...savedData,
        lookLikeItems: savedData.what_does_it_look_like ? 
          JSON.parse(savedData.what_does_it_look_like) : [],
        completions: savedData.what_does_it_look_like_completions || {}
      } : data;
      
      // Update with the saved data from the backend to ensure we have the latest values
      setBlueprintData(prev => ({
        ...prev,
        threeYearPicture: transformedData
      }));
      setSuccess('Long-term Vision updated successfully');
      // Refresh the business blueprint data to ensure everything is in sync
      setTimeout(() => {
        fetchBusinessBlueprint();
      }, 500);
    } catch (error) {
      setError('Failed to update Long-term Vision');
      throw error;
    } finally {
      setSaving(false);
    }
  };
  
  // Handler for toggling lookLike item checkboxes
  const handleToggleLookLikeItem = async (index) => {
    try {
      const result = await businessBlueprintService.toggleThreeYearItem(index);
      setLookLikeCheckedItems(prev => ({
        ...prev,
        [index]: !prev[index]
      }));
    } catch (error) {
      console.error('Failed to toggle item:', error);
      setError('Failed to update item completion status');
    }
  };
  
  // Handler for toggling Annual Goals checkboxes
  const handleToggleOneYearGoal = async (goalId, index) => {
    try {
      if (!goalId) {
        console.error('Goal ID not provided');
        return;
      }
      
      const result = await businessBlueprintService.toggleOneYearGoal(goalId);
      setOneYearGoalsCheckedItems(prev => ({
        ...prev,
        [index]: result.is_completed
      }));
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      setError('Failed to update goal completion status');
    }
  };

  // One Year Plan handler
  const handleSaveOneYearPlan = async (data) => {
    try {
      setSaving(true);
      setError(null);
      const savedData = await businessBlueprintService.updateOneYearPlan(data);
      console.log('Saved data from backend:', savedData);
      console.log('Goals from backend:', savedData.goals);
      // Update with the saved data from the backend, properly formatting it
      // The backend returns goals as objects with goal_text property
      setBlueprintData(prev => ({
        ...prev,
        oneYearPlan: {
          ...savedData,
          revenue: savedData.revenue_target || '',
          profit: savedData.profit_percentage || '',
          goals: savedData.goals && Array.isArray(savedData.goals) ? 
            savedData.goals.map(goal => {
              // Handle both object format (from backend) and string format (from dialog)
              if (typeof goal === 'object' && goal !== null) {
                return goal; // Already in correct format with goal_text
              } else if (typeof goal === 'string') {
                return { goal_text: goal }; // Convert string to object format
              }
              return goal;
            }) : [],
          measurables: savedData.measurables || [],
          revenueStreams: savedData.revenueStreams || []
        }
      }));
      setSuccess('Annual Goals updated successfully');
      // No need to refresh since we're getting complete data from backend
    } catch (error) {
      setError('Failed to update Annual Goals');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Draft Goals Functions
  const fetchDraftGoals = async () => {
    if (!selectedDepartment?.id) return;
    
    try {
      const user = useAuthStore.getState().user;
      const organizationId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment.id;
      const nextYear = new Date().getFullYear() + 1;
      
      const data = await annualPlanningGoalsService.getPlanningGoals(
        organizationId,
        teamId,
        nextYear
      );
      
      // Only set if goals exist and are not empty
      if (data && data.goals && data.goals.length > 0) {
        setDraftGoals(data);
      } else {
        setDraftGoals(null);
      }
    } catch (error) {
      console.error('Error fetching draft goals:', error);
      setDraftGoals(null);
    }
  };

  const handleSaveDraftGoals = async (updatedGoals) => {
    if (!selectedDepartment?.id) return;
    
    try {
      const user = useAuthStore.getState().user;
      const organizationId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment.id;
      const nextYear = new Date().getFullYear() + 1;
      
      await annualPlanningGoalsService.savePlanningGoals(
        organizationId,
        teamId,
        nextYear,
        updatedGoals
      );
      
      setDraftGoals({
        ...draftGoals,
        goals: updatedGoals
      });
      
      setShowDraftGoalsModal(false);
      setSuccess('Draft goals saved successfully');
    } catch (error) {
      console.error('Error saving draft goals:', error);
      setError('Failed to save draft goals');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                 style={{
                   background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                   color: themeColors.primary
                 }}>
              <Building2 className="h-4 w-4" />
              STRATEGIC PLANNING
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
              {labels.business_blueprint_label || '2-Page Plan'}
            </h1>
            <p className="text-lg text-slate-600">Define your organization's vision and strategy for success</p>
          </div>
          {/* View/Edit Mode Toggle and Actions */}
          <div className="flex items-center gap-3 no-print">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg p-1 flex items-center">
            <Button
              variant={viewMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode(true)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode ? 'text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{
                backgroundColor: viewMode ? themeColors.primary : 'transparent'
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button
              variant={!viewMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode(false)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                !viewMode ? 'text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{
                backgroundColor: !viewMode ? themeColors.primary : 'transparent'
              }}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Edit
            </Button>
            </div>
            {viewMode && (
              <Button
                onClick={() => window.print()}
                className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 text-slate-700 hover:text-slate-900"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert className="border-red-200/50 bg-red-50/80 backdrop-blur-sm rounded-2xl shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200/50 bg-green-50/80 backdrop-blur-sm rounded-2xl shadow-sm">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Conditionally render View Mode or Edit Mode */}
        {viewMode ? (
          /* View Mode - Clean presentation using TwoPagePlanView */
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <TwoPagePlanView hideIssuesAndPriorities={true} />
          </div>
        ) : (
          /* Edit Mode - Existing tabbed interface with glass-morphism */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 h-16 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg">
            <TabsTrigger 
              value="vision" 
              className="text-lg font-medium transition-all duration-200 flex items-center gap-3 rounded-xl"
              style={{ 
                background: activeTab === 'vision' ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` : 'transparent',
                color: activeTab === 'vision' ? 'white' : 'inherit',
                boxShadow: activeTab === 'vision' ? '0 8px 32px rgba(0,0,0,0.12)' : 'none'
              }}
            >
              <Target className="h-5 w-5" style={{ color: activeTab === 'vision' ? 'white' : themeColors.primary }} />
              {tabLabels.vision}
            </TabsTrigger>
            <TabsTrigger 
              value="execution" 
              className="text-lg font-medium transition-all duration-200 flex items-center gap-3 rounded-xl"
              style={{ 
                background: activeTab === 'execution' ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` : 'transparent',
                color: activeTab === 'execution' ? 'white' : 'inherit',
                boxShadow: activeTab === 'execution' ? '0 8px 32px rgba(0,0,0,0.12)' : 'none'
              }}
            >
              <TrendingUp className="h-5 w-5" style={{ color: activeTab === 'execution' ? 'white' : themeColors.primary }} />
              {tabLabels.execution}
            </TabsTrigger>
          </TabsList>

        <TabsContent value="vision" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Core Values, Focus, Long Range Plan, Marketing Strategy */}
          <div className="lg:col-span-2 space-y-8">
            {/* Core Values */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="flex items-center text-xl font-bold text-slate-900">
                <div className="p-2 rounded-xl mr-3" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                  <Users className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
                {frameworkSections.coreValues.label}
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                {frameworkSections.coreValues.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {blueprintData.coreValues.map((value) => (
                <div key={value.id} className="flex items-start justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{value.value}</h4>
                    {value.description && (
                      <p className="text-sm text-slate-600 mt-1 font-medium">{value.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCoreValue(value)}
                      className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCoreValue(value.id)}
                      className="hover:bg-red-50/80 hover:text-red-600 backdrop-blur-sm transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-white/20">
                <Button 
                  onClick={handleAddCoreValue} 
                  disabled={saving} 
                  className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Core Value
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Core Focus */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="flex items-center text-xl font-bold text-slate-900">
                <div className="p-2 rounded-xl mr-3" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                  <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
                {frameworkSections.coreFocus.label}
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                {frameworkSections.coreFocus.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Display saved values or edit form */}
              {(!editingCoreFocus && (blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] || blueprintData.coreFocus.niche)) ? (
                <>
                  {/* Purpose/Mission Display */}
                  {blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] && (
                    <div className="flex items-start justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">
                          {blueprintData.coreFocus.hedgehogType.charAt(0).toUpperCase() + blueprintData.coreFocus.hedgehogType.slice(1)}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1 font-medium">
                          {blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType]}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCoreFocus(true)}
                          className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Niche Display */}
                  {blueprintData.coreFocus.niche && (
                    <div className="flex items-start justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{frameworkSections.coreFocus.nicheLabel || 'Niche'}</h4>
                        <p className="text-sm text-slate-600 mt-1 font-medium">
                          {blueprintData.coreFocus.niche}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCoreFocus(true)}
                          className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Add button if not all fields are filled */}
                  {(!blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] || !blueprintData.coreFocus.niche) && (
                    <Button
                      variant="outline"
                      onClick={() => setEditingCoreFocus(true)}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {!blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] && !blueprintData.coreFocus.niche 
                        ? 'Add Core Focus' 
                        : 'Complete Core Focus'}
                    </Button>
                  )}
                </>
              ) : (
                /* Edit Form */
                <>
                  <div>
                    <Label>Select your Focus type</Label>
                    <RadioGroup
                      value={blueprintData.coreFocus.hedgehogType}
                      onValueChange={(value) => setBlueprintData(prev => ({
                        ...prev,
                        coreFocus: { ...prev.coreFocus, hedgehogType: value }
                      }))}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="purpose" id="purpose" />
                        <Label htmlFor="purpose">Purpose</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cause" id="cause" />
                        <Label htmlFor="cause">Cause</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="passion" id="passion" />
                        <Label htmlFor="passion">Passion</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="hedgehog-description">
                      {blueprintData.coreFocus.hedgehogType === 'purpose' ? 'Purpose' : 
                       blueprintData.coreFocus.hedgehogType === 'cause' ? 'Cause' : 'Passion'}
                    </Label>
                    <Textarea
                      id="hedgehog-description"
                      value={blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType]}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        coreFocus: { 
                          ...prev.coreFocus, 
                          [prev.coreFocus.hedgehogType]: e.target.value 
                        }
                      }))}
                      placeholder={`Enter your ${blueprintData.coreFocus.hedgehogType}...`}
                    />
                  </div>

                  <div>
                    <Label htmlFor="niche">{frameworkSections.coreFocus.nicheLabel || 'Niche'}</Label>
                    <Textarea
                      id="niche"
                      value={blueprintData.coreFocus.niche}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        coreFocus: { ...prev.coreFocus, niche: e.target.value }
                      }))}
                      placeholder="What is your niche?"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={async () => {
                        await handleSaveCoreFocus();
                        setEditingCoreFocus(false);
                      }} 
                      disabled={saving} 
                      style={{ backgroundColor: themeColors.primary }} className="hover:opacity-90 text-white flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Focus
                    </Button>
                    {(blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] || blueprintData.coreFocus.niche) && (
                      <Button
                        variant="outline"
                        onClick={() => setEditingCoreFocus(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Long Range Plan */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="flex items-center text-xl font-bold text-slate-900">
                <div className="p-2 rounded-xl mr-3" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                  <TrendingUp className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
                {frameworkSections.tenYearTarget.label}
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                {frameworkSections.tenYearTarget.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Display saved values or edit form */}
              {(!editingBHAG && (blueprintData.bhag.year || blueprintData.bhag.description)) ? (
                <>
                  {/* Year Display */}
                  {blueprintData.bhag.year && (
                    <div className="flex items-start justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">Target Year</h4>
                        <p className="text-sm text-slate-600 mt-1 font-medium">
                          {blueprintData.bhag.year}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBHAG(true)}
                          className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Description Display */}
                  {blueprintData.bhag.description && (
                    <div className="flex items-start justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">Vision Description</h4>
                        <p className="text-sm text-slate-600 mt-1 font-medium">
                          {blueprintData.bhag.description}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBHAG(true)}
                          className="hover:bg-white/80 backdrop-blur-sm transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Add button if not all fields are filled */}
                  {(!blueprintData.bhag.year || !blueprintData.bhag.description) && (
                    <Button
                      variant="outline"
                      onClick={() => setEditingBHAG(true)}
                      className="w-full bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {!blueprintData.bhag.year && !blueprintData.bhag.description 
                        ? 'Add Long Range Plan' 
                        : 'Complete Long Range Plan'}
                    </Button>
                  )}
                </>
              ) : (
                /* Edit Form */
                <>
                  <div>
                    <Label htmlFor="bhagYear">Target Year</Label>
                    <Input
                      id="bhagYear"
                      type="number"
                      value={blueprintData.bhag.year}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        bhag: { ...prev.bhag, year: parseInt(e.target.value) }
                      }))}
                      min={new Date().getFullYear() + 1}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bhagDescription">Vision Description</Label>
                    <Textarea
                      id="bhagDescription"
                      value={blueprintData.bhag.description}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        bhag: { ...prev.bhag, description: e.target.value }
                      }))}
                      placeholder="Describe your long range vision..."
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={async () => {
                        await handleSaveBHAG();
                        setEditingBHAG(false);
                      }} 
                      disabled={saving} 
                      style={{ backgroundColor: themeColors.primary }} className="hover:opacity-90 text-white flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Long Range Plan
                    </Button>
                    {(blueprintData.bhag.year || blueprintData.bhag.description) && (
                      <Button
                        variant="outline"
                        onClick={() => setEditingBHAG(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Marketing Strategy */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center text-xl text-gray-900">
                <Lightbulb className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
                {frameworkSections.marketingStrategy.label}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {frameworkSections.marketingStrategy.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display saved values or edit form */}
              {(!editingMarketingStrategy && (
                blueprintData.marketingStrategy.targetMarket || 
                blueprintData.marketingStrategy.demographicProfile ||
                blueprintData.marketingStrategy.geographicProfile ||
                blueprintData.marketingStrategy.psychographicProfile ||
                blueprintData.marketingStrategy.differentiators.some(d => d) ||
                blueprintData.marketingStrategy.provenProcessExists !== undefined ||
                blueprintData.marketingStrategy.guaranteeExists !== undefined
              )) ? (
                <>
                  {/* Target Market Display */}
                  {(blueprintData.marketingStrategy.demographicProfile || 
                    blueprintData.marketingStrategy.geographicProfile || 
                    blueprintData.marketingStrategy.psychographicProfile ||
                    blueprintData.marketingStrategy.targetMarket) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{frameworkSections.marketingStrategy.targetMarketLabel || 'Target Market'}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMarketingStrategy(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      {blueprintData.marketingStrategy.demographicProfile && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <h5 className="text-sm font-bold text-gray-700">Demographic</h5>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {blueprintData.marketingStrategy.demographicProfile}
                          </p>
                        </div>
                      )}
                      {blueprintData.marketingStrategy.geographicProfile && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <h5 className="text-sm font-bold text-gray-700">Geographic</h5>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {blueprintData.marketingStrategy.geographicProfile}
                          </p>
                        </div>
                      )}
                      {blueprintData.marketingStrategy.psychographicProfile && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <h5 className="text-sm font-bold text-gray-700">Psychographic</h5>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {blueprintData.marketingStrategy.psychographicProfile}
                          </p>
                        </div>
                      )}
                      {/* Legacy target market display if only old field has data */}
                      {blueprintData.marketingStrategy.targetMarket && 
                       !blueprintData.marketingStrategy.demographicProfile && 
                       !blueprintData.marketingStrategy.geographicProfile && 
                       !blueprintData.marketingStrategy.psychographicProfile && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {blueprintData.marketingStrategy.targetMarket}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Differentiators Display */}
                  {blueprintData.marketingStrategy.differentiators.filter(d => d).length > 0 && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{frameworkSections.marketingStrategy.differentiatorsLabel || 'Differentiators'}</h4>
                        <ul className="text-sm text-gray-600 mt-1 space-y-1">
                          {blueprintData.marketingStrategy.differentiators
                            .filter(d => d)
                            .map((diff, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-gray-400 mr-2">•</span>
                                {diff}
                              </li>
                            ))}
                        </ul>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMarketingStrategy(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Proven Process Display */}
                  {(blueprintData.marketingStrategy.provenProcessExists !== undefined && blueprintData.marketingStrategy.provenProcessExists !== null) && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{frameworkSections.marketingStrategy.provenProcessLabel || 'Proven Process'}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.marketingStrategy.provenProcessExists ? 
                            '✓ Yes, we have a proven process' : 
                            '✗ No, we don\'t have a proven process'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMarketingStrategy(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Guarantee Display */}
                  {(blueprintData.marketingStrategy.guaranteeExists !== undefined && blueprintData.marketingStrategy.guaranteeExists !== null) && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Guarantee</h4>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                          {blueprintData.marketingStrategy.guaranteeExists ? 
                            (blueprintData.marketingStrategy.guaranteeDescription || '✓ Yes, we have a guarantee') : 
                            '✗ No, we don\'t have a guarantee'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMarketingStrategy(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Add button if nothing is filled */}
                  {!blueprintData.marketingStrategy.targetMarket && 
                   !blueprintData.marketingStrategy.demographicProfile &&
                   !blueprintData.marketingStrategy.geographicProfile &&
                   !blueprintData.marketingStrategy.psychographicProfile &&
                   !blueprintData.marketingStrategy.differentiators.some(d => d) &&
                   blueprintData.marketingStrategy.provenProcessExists === undefined &&
                   blueprintData.marketingStrategy.guaranteeExists === undefined && (
                    <Button
                      variant="outline"
                      onClick={() => setEditingMarketingStrategy(true)}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Marketing Strategy
                    </Button>
                  )}
                </>
              ) : (
                /* Edit Form */
                <>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">{frameworkSections.marketingStrategy.targetMarketLabel || 'Target Market'}</h4>
                    <div>
                      <Label htmlFor="demographicProfile">Demographic</Label>
                      <Textarea
                        id="demographicProfile"
                        value={blueprintData.marketingStrategy.demographicProfile}
                        onChange={(e) => setBlueprintData(prev => ({
                          ...prev,
                          marketingStrategy: { ...prev.marketingStrategy, demographicProfile: e.target.value }
                        }))}
                        placeholder="Age, income, education level, occupation, etc..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="geographicProfile">Geographic</Label>
                      <Textarea
                        id="geographicProfile"
                        value={blueprintData.marketingStrategy.geographicProfile}
                        onChange={(e) => setBlueprintData(prev => ({
                          ...prev,
                          marketingStrategy: { ...prev.marketingStrategy, geographicProfile: e.target.value }
                        }))}
                        placeholder="Location, region, urban/suburban/rural, climate, etc..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="psychographicProfile">Psychographic</Label>
                      <Textarea
                        id="psychographicProfile"
                        value={blueprintData.marketingStrategy.psychographicProfile}
                        onChange={(e) => setBlueprintData(prev => ({
                          ...prev,
                          marketingStrategy: { ...prev.marketingStrategy, psychographicProfile: e.target.value }
                        }))}
                        placeholder="Lifestyle, values, interests, attitudes, behaviors, etc..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>{frameworkSections.marketingStrategy.differentiatorsLabel || 'Differentiators'} (3-5)</Label>
                      {blueprintData.marketingStrategy.differentiators.length < 5 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setBlueprintData(prev => ({
                            ...prev,
                            marketingStrategy: {
                              ...prev.marketingStrategy,
                              differentiators: [...prev.marketingStrategy.differentiators, '']
                            }
                          }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {blueprintData.marketingStrategy.differentiators.map((diff, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Differentiator ${index + 1}`}
                            value={diff}
                            onChange={(e) => setBlueprintData(prev => {
                              const newDifferentiators = [...prev.marketingStrategy.differentiators];
                              newDifferentiators[index] = e.target.value;
                              return {
                                ...prev,
                                marketingStrategy: {
                                  ...prev.marketingStrategy,
                                  differentiators: newDifferentiators
                                }
                              };
                            })}
                          />
                          {blueprintData.marketingStrategy.differentiators.length > 3 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setBlueprintData(prev => ({
                                ...prev,
                                marketingStrategy: {
                                  ...prev.marketingStrategy,
                                  differentiators: prev.marketingStrategy.differentiators.filter((_, i) => i !== index)
                                }
                              }))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="provenProcess">{frameworkSections.marketingStrategy.provenProcessLabel || 'Proven Process'}</Label>
                    <Switch
                      id="provenProcess"
                      checked={blueprintData.marketingStrategy.provenProcessExists}
                      onCheckedChange={(checked) => setBlueprintData(prev => ({
                        ...prev,
                        marketingStrategy: { ...prev.marketingStrategy, provenProcessExists: checked }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="guarantee">Guarantee</Label>
                      <Switch
                        id="guarantee"
                        checked={blueprintData.marketingStrategy.guaranteeExists}
                        onCheckedChange={(checked) => setBlueprintData(prev => ({
                          ...prev,
                          marketingStrategy: { ...prev.marketingStrategy, guaranteeExists: checked }
                        }))}
                      />
                    </div>
                    {blueprintData.marketingStrategy.guaranteeExists && (
                      <Input
                        placeholder="Describe your guarantee..."
                        value={blueprintData.marketingStrategy.guaranteeDescription}
                        onChange={(e) => setBlueprintData(prev => ({
                          ...prev,
                          marketingStrategy: { ...prev.marketingStrategy, guaranteeDescription: e.target.value }
                        }))}
                      />
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={async () => {
                        await handleSaveMarketingStrategy();
                        setEditingMarketingStrategy(false);
                      }} 
                      disabled={saving} 
                      style={{ backgroundColor: themeColors.primary }} className="hover:opacity-90 text-white flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Marketing Strategy
                    </Button>
                    {(blueprintData.marketingStrategy.targetMarket || 
                      blueprintData.marketingStrategy.demographicProfile ||
                      blueprintData.marketingStrategy.geographicProfile ||
                      blueprintData.marketingStrategy.psychographicProfile ||
                      blueprintData.marketingStrategy.differentiators.some(d => d) ||
                      blueprintData.marketingStrategy.provenProcessExists !== undefined ||
                      blueprintData.marketingStrategy.guaranteeExists !== undefined) && (
                      <Button
                        variant="outline"
                        onClick={() => setEditingMarketingStrategy(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Right Column - Long-term Vision */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-xl font-bold text-slate-900">
                      <div className="p-2 rounded-xl mr-3" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                        <Calendar className="h-5 w-5" style={{ color: themeColors.primary }} />
                      </div>
                      {frameworkSections.threeYearPicture.label}
                    </CardTitle>
                    <CardDescription className="text-slate-600 font-medium">
                      {frameworkSections.threeYearPicture.description}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowThreeYearDialog(true)}
                    className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {blueprintData.threeYearPicture ? (
                  <div className="space-y-4">
                    {/* Target Date */}
                    {blueprintData.threeYearPicture.future_date && (
                      <div className="p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 mr-3 mt-0.5" style={{ color: themeColors.primary }} />
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900">Target Date</h4>
                            <p className="text-sm text-slate-600 mt-1 font-medium">
                              {(() => {
                                // Parse date string manually to avoid timezone issues
                                const [year, month, day] = blueprintData.threeYearPicture.future_date.split('T')[0].split('-');
                                const date = new Date(year, month - 1, day, 12, 0, 0);
                                return date.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                });
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Financial Goals */}
                    {(blueprintData.threeYearPicture.revenue_target || blueprintData.threeYearPicture.profit_target || 
                      (blueprintData.threeYearPicture.revenueStreams && blueprintData.threeYearPicture.revenueStreams.length > 0)) && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start">
                          <DollarSign className="h-5 w-5 mr-3 mt-0.5" style={{ color: themeColors.primary }} />
                          <div className="flex-1 space-y-3">
                            <h4 className="font-semibold text-gray-900">Financial Goals</h4>
                            
                            {/* Display revenue streams if available */}
                            {blueprintData.threeYearPicture.revenueStreams && blueprintData.threeYearPicture.revenueStreams.length > 0 ? (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Revenue Streams</p>
                                {blueprintData.threeYearPicture.revenueStreams.map((stream, index) => (
                                  <div key={index} className="ml-2 mb-1">
                                    <span className="text-sm text-gray-600">{stream.name}:</span>
                                    <span className="text-sm font-semibold text-gray-900 ml-2">
                                      {formatCurrency(stream.revenue_target) || 'Not set'}
                                    </span>
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <span className="text-sm font-medium text-gray-700">Total Revenue:</span>
                                  {/* Total calculation removed - can't sum freeform text values */}
                                </div>
                              </div>
                            ) : blueprintData.threeYearPicture.revenue_target ? (
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  {getRevenueLabelWithSuffix(organization, 'Target')}
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(blueprintData.threeYearPicture.revenue_target)}
                                </p>
                              </div>
                            ) : null}
                            
                            {blueprintData.threeYearPicture.profit_target && (
                              <div>
                                <p className="text-sm font-medium text-gray-700">Profit Target</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {blueprintData.threeYearPicture.profit_target}
                                </p>
                              </div>
                            )}
                            
                            {/* Key Measurables */}
                            {blueprintData.threeYearPicture.measurables && blueprintData.threeYearPicture.measurables.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Key Measurables</p>
                                {blueprintData.threeYearPicture.measurables.map((measurable, index) => (
                                  <div key={index} className="ml-2 mb-1">
                                    <span className="text-sm text-gray-600">• {measurable.name}:</span>
                                    <span className="text-sm font-semibold text-gray-900 ml-2">
                                      {measurable.target_value || 'Not set'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* What Does It Look Like */}
                    {blueprintData.threeYearPicture.lookLikeItems && blueprintData.threeYearPicture.lookLikeItems.filter(item => item).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center mb-2">
                          <Eye className="h-5 w-5 mr-2" style={{ color: themeColors.primary }} />
                          <h4 className="font-semibold text-gray-900">What does it look like?</h4>
                        </div>
                        {blueprintData.threeYearPicture.lookLikeItems.filter(item => item).map((item, originalIndex) => {
                          // Get the actual index from the original array
                          const actualIndex = blueprintData.threeYearPicture.lookLikeItems.indexOf(item);
                          return (
                            <div 
                              key={actualIndex} 
                              className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow flex items-start gap-3"
                            >
                              <input
                                type="checkbox"
                                checked={lookLikeCheckedItems[actualIndex] || false}
                                onChange={() => handleToggleLookLikeItem(actualIndex)}
                                className="mt-0.5 h-4 w-4 border-gray-300 rounded" style={{ color: themeColors.primary }}
                              />
                              <p className={`text-sm text-gray-700 ${lookLikeCheckedItems[actualIndex] ? 'line-through opacity-60' : ''}`}>
                                {item}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Eye className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Define Your 3-Year Vision</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      Set clear targets and paint a picture of what success looks like in 3 years
                    </p>
                    <Button 
                      onClick={() => setShowThreeYearDialog(true)}
                      style={{ backgroundColor: themeColors.primary }} className="hover:opacity-90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Long-term Vision
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="execution" className="space-y-8">
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl mr-3" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    {frameworkSections.oneYearPlan.label}
                  </CardTitle>
                  <CardDescription className="text-slate-600 font-medium">
                    {frameworkSections.oneYearPlan.description}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowOneYearDialog(true)}
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {blueprintData.oneYearPlan ? (
                <div className="space-y-4">
                  {/* Target Date */}
                  {blueprintData.oneYearPlan.future_date && (
                    <div className="p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 mr-3 mt-0.5" style={{ color: themeColors.primary }} />
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">Target Date</h4>
                          <p className="text-sm text-slate-600 mt-1 font-medium">
                            {new Date(blueprintData.oneYearPlan.future_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Financial Goals */}
                  {(blueprintData.oneYearPlan.revenue_target || blueprintData.oneYearPlan.profit_percentage || 
                    (blueprintData.oneYearPlan.revenueStreams && blueprintData.oneYearPlan.revenueStreams.length > 0)) && (
                    <div className="p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                      <div className="flex items-start">
                        <DollarSign className="h-5 w-5 mr-3 mt-0.5" style={{ color: themeColors.primary }} />
                        <div className="flex-1 space-y-3">
                          <h4 className="font-semibold text-gray-900">Financial Goals</h4>
                          
                          {/* Display revenue streams if available */}
                          {blueprintData.oneYearPlan.revenueStreams && blueprintData.oneYearPlan.revenueStreams.length > 0 ? (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Revenue Streams</p>
                              {blueprintData.oneYearPlan.revenueStreams.map((stream, index) => (
                                <div key={index} className="ml-2 mb-1">
                                  <span className="text-sm text-gray-600">{stream.name}:</span>
                                  <span className="text-sm font-semibold text-gray-900 ml-2">
                                    ${Number(stream.revenue_target) < 1 
                                      ? `${(Number(stream.revenue_target) * 1000).toFixed(0)}K`
                                      : `${Number(stream.revenue_target).toFixed(1)}M`}
                                  </span>
                                </div>
                              ))}
                              {/* Total section removed - can't sum freeform text values */}
                              <div className="mt-2 pt-2 border-t border-gray-200 hidden">
                                {/* Total calculation removed - can't sum freeform text values */}
                              </div>
                            </div>
                          ) : blueprintData.oneYearPlan.revenue_target ? (
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {getRevenueLabelWithSuffix(organization, 'Target')}
                              </p>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(blueprintData.oneYearPlan.revenue_target)}
                              </p>
                            </div>
                          ) : null}
                          
                          {blueprintData.oneYearPlan.profit_percentage && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Profit Target</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {blueprintData.oneYearPlan.profit_percentage}
                              </p>
                            </div>
                          )}
                          
                          {/* Key Measurables */}
                          {blueprintData.oneYearPlan.measurables && blueprintData.oneYearPlan.measurables.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Key Measurables</p>
                              {blueprintData.oneYearPlan.measurables.map((measurable, index) => (
                                <div key={index} className="ml-2 mb-1">
                                  <span className="text-sm text-gray-600">• {measurable.name}:</span>
                                  <span className="text-sm font-semibold text-gray-900 ml-2">
                                    {measurable.target_value || 'Not set'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Goals - Debug */}
                  {console.log('Goals data:', blueprintData.oneYearPlan.goals)}
                  {console.log('Goals is array:', Array.isArray(blueprintData.oneYearPlan.goals))}
                  {console.log('Goals length:', blueprintData.oneYearPlan.goals?.length)}
                  {console.log('First goal:', blueprintData.oneYearPlan.goals?.[0])}
                  
                  {/* Goals */}
                  {blueprintData.oneYearPlan.goals && Array.isArray(blueprintData.oneYearPlan.goals) && blueprintData.oneYearPlan.goals.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center mb-2">
                        <Flag className="h-5 w-5 mr-2" style={{ color: themeColors.primary }} />
                        <h4 className="font-semibold text-gray-900">Goals</h4>
                      </div>
                      {blueprintData.oneYearPlan.goals.filter(goal => {
                        // Filter for valid goals - either objects with goal_text or non-empty strings
                        if (typeof goal === 'object' && goal !== null && goal.goal_text) {
                          return true;
                        }
                        if (typeof goal === 'string' && goal.trim()) {
                          return true;
                        }
                        return false;
                      }).map((goal, index) => {
                        return (
                          <div 
                            key={goal.id || index} 
                            className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow flex items-start gap-3"
                          >
                            <input
                              type="checkbox"
                              checked={oneYearGoalsCheckedItems[index] || false}
                              onChange={() => handleToggleOneYearGoal(goal.id || null, index)}
                              className="mt-0.5 h-4 w-4 border-gray-300 rounded" style={{ color: themeColors.primary }}
                            />
                            <div className="flex items-start flex-1">
                              <span className={`font-semibold mr-2 ${oneYearGoalsCheckedItems[index] ? 'line-through opacity-60' : ''}`} style={{ color: themeColors.primary }}>
                                {index + 1}.
                              </span>
                              <p className={`text-sm text-gray-700 ${oneYearGoalsCheckedItems[index] ? 'line-through opacity-60' : ''}`}>
                                {typeof goal === 'string' ? goal : goal.goal_text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Target className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Define Your 1-Year Goals</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Set specific, measurable targets for the year ahead
                  </p>
                  <Button 
                    onClick={() => setShowOneYearDialog(true)}
                    style={{ backgroundColor: themeColors.primary }} className="hover:opacity-90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Annual Goals
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Draft Next Year Goals Section */}
          {draftGoals && draftGoals.goals && draftGoals.goals.length > 0 && (
            <Card className="mb-6 bg-blue-50/80 border-2 border-blue-200 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-blue-900">
                      {new Date().getFullYear() + 1} Goals (Draft)
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      Set during Annual Planning • {draftGoals.created_at && new Date(draftGoals.created_at).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </CardDescription>
                  </div>
                  <span className="px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-sm font-medium">
                    Draft
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Draft Goals List */}
                <div className="space-y-2 mb-4">
                  {draftGoals.goals.map((goal, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border border-blue-200">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                      <p className="flex-1 text-gray-800">{goal}</p>
                    </div>
                  ))}
                </div>
                
                {/* Info Banner */}
                <Alert className="mb-4 border-blue-300 bg-blue-100">
                  <AlertDescription className="text-blue-900 flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    These goals will automatically replace {new Date().getFullYear()} goals on January 1, {new Date().getFullYear() + 1}
                  </AlertDescription>
                </Alert>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDraftGoalsModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Edit Draft Goals
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
        )}

      {/* Core Value Edit Dialog - Only show in edit mode */}
      {!viewMode && (
        <>
      <CoreValueDialog
        open={showCoreValueDialog}
        onOpenChange={setShowCoreValueDialog}
        value={editingCoreValue}
        onSave={editingCoreValue ? handleSaveCoreValue : handleSaveNewCoreValue}
      />

      {/* Three Year Picture Dialog */}
      <ThreeYearPictureDialog
        open={showThreeYearDialog}
        onOpenChange={setShowThreeYearDialog}
        data={blueprintData.threeYearPicture}
        onSave={handleSaveThreeYearPicture}
        organization={organization}
      />

      {/* One Year Plan Dialog */}
      <OneYearPlanDialog
        open={showOneYearDialog}
        onOpenChange={setShowOneYearDialog}
        data={blueprintData.oneYearPlan}
        onSave={handleSaveOneYearPlan}
        organization={organization}
      />
        </>
      )}

      {/* Draft Goals Edit Modal */}
      <DraftGoalsEditModal
        isOpen={showDraftGoalsModal}
        onClose={() => setShowDraftGoalsModal(false)}
        goals={draftGoals?.goals || []}
        year={new Date().getFullYear() + 1}
        onSave={handleSaveDraftGoals}
      />

      </div>
    </div>
  );
};

export default BusinessBlueprintPage;