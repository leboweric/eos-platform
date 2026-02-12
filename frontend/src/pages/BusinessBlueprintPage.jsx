import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link, Navigate } from 'react-router-dom';
import { businessBlueprintService } from '../services/businessBlueprintService';
import { organizationService } from '../services/organizationService';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import annualPlanningGoalsService from '../services/annualPlanningGoalsService';
import { departmentService } from '../services/departmentService';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import CoreValueDialog from '../components/vto/CoreValueDialog';
import ThreeYearPictureDialog from '../components/vto/ThreeYearPictureDialog';
import OneYearPlanDialog from '../components/vto/OneYearPlanDialog';
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
  Download,
  ChevronDown,
  Shield,
  Rocket,
  X
} from 'lucide-react';

const BusinessBlueprintPage = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const { selectedDepartment, availableDepartments } = useDepartment();
  const { labels } = useTerminology();
  
  // Determine framework mode
  const isEOS = labels.priorities_label === 'Rocks';
  const isOKR = labels.priorities_label === 'Objectives';
  const isScalingUp = labels.priorities_label === 'Priorities';
  const is4DX = labels.priorities_label === 'WIGs';
  
  // Tab labels based on framework
  const tabLabels = {
    vision: isEOS ? 'Vision' : isOKR ? 'Strategy' : isScalingUp ? 'Core Strategy' : is4DX ? 'Strategy' : 'Vision',
    execution: isEOS ? 'Traction' : isOKR ? 'Execution' : isScalingUp ? 'Execution Plan' : is4DX ? 'Execution' : 'Execution'
  };
  
  // Framework-specific section labels
  const getFrameworkSections = () => {
    if (isEOS) {
      return {
        coreValues: { label: 'Core Values', description: 'The fundamental beliefs of your organization' },
        coreFocus: { 
          label: 'Core Focus', 
          description: 'Your organization\'s purpose/cause/passion and niche',
          purposeLabel: 'Purpose/Cause/Passion',
          nicheLabel: 'Niche'
        },
        tenYearTarget: { label: '10-Year Target', description: 'Your Big Hairy Audacious Goal' },
        marketingStrategy: { 
          label: 'Marketing Strategy', 
          description: 'How you attract and retain customers',
          targetMarketLabel: 'Target Market',
          differentiatorsLabel: 'Three Uniques',
          provenProcessLabel: 'Proven Process'
        },
        threeYearPicture: { label: '3-Year Picture', description: 'What your organization looks like in 3 years' },
        oneYearPlan: { label: '1-Year Plan', description: 'This year\'s goals and priorities' }
      };
    } else if (isOKR) {
      return {
        coreValues: { label: 'Core Values', description: 'Guiding principles for your team' },
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [organization, setOrganization] = useState(null);
  
  // Leadership Team viewing
  const [viewingLeadershipTeam, setViewingLeadershipTeam] = useState(false);
  const [leadershipTeamId, setLeadershipTeamId] = useState(null);
  const [leadershipBlueprintData, setLeadershipBlueprintData] = useState(null);
  const [loadingLeadership, setLoadingLeadership] = useState(false);
  
  // Check if viewing department-level plan
  const isDepartmentView = selectedDepartment && !selectedDepartment.is_leadership_team;
  const isReadOnly = viewingLeadershipTeam && isDepartmentView;
  
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

  // Quarterly Rocks data
  const [quarterlyRocks, setQuarterlyRocks] = useState([]);
  const [loadingRocks, setLoadingRocks] = useState(false);

  // New core value form
  const [editingCoreValue, setEditingCoreValue] = useState(null);
  const [showCoreValueDialog, setShowCoreValueDialog] = useState(false);
  
  // Dialog states for planning sections
  const [showThreeYearDialog, setShowThreeYearDialog] = useState(false);
  const [showOneYearDialog, setShowOneYearDialog] = useState(false);
  
  // Draft goals state for Annual Planning
  const [draftGoals, setDraftGoals] = useState(null);
  const [showDraftGoalsModal, setShowDraftGoalsModal] = useState(false);
  
  // State for inline editing sections
  const [editingCoreFocus, setEditingCoreFocus] = useState(false);
  const [editingBHAG, setEditingBHAG] = useState(false);
  const [editingMarketingStrategy, setEditingMarketingStrategy] = useState(false);
  
  // State for organization theme colors
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  // State for tracking checked items in Long-term Vision and Annual Goals
  const [lookLikeCheckedItems, setLookLikeCheckedItems] = useState({});
  const [oneYearGoalsCheckedItems, setOneYearGoalsCheckedItems] = useState({});

  // Auto-dismiss success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch data on mount and when department changes
  useEffect(() => {
    fetchBusinessBlueprint();
    fetchOrganization();
    fetchOrganizationTheme();
    fetchDraftGoals();
    fetchQuarterlyRocks();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [selectedDepartment?.id]);

  // Find leadership team ID from available departments
  useEffect(() => {
    if (availableDepartments && availableDepartments.length > 0) {
      const leadershipTeam = availableDepartments.find(d => d.is_leadership_team);
      if (leadershipTeam) {
        setLeadershipTeamId(leadershipTeam.id);
      }
    }
  }, [availableDepartments]);
  
  // Hide sidebar if coming from meeting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromMeeting = urlParams.get('fromMeeting') === 'true';
    
    if (fromMeeting) {
      sessionStorage.setItem('hideSidebarTemp', 'true');
    }
    
    return () => {
      if (fromMeeting) {
        sessionStorage.removeItem('hideSidebarTemp');
      }
    };
  }, []);

  // ========== DATA FETCHING ==========

  const fetchBusinessBlueprint = async () => {
    try {
      if (isInitialLoad) setLoading(true);
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
          ].filter((d, index) => index < 3 || d),
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
      setIsInitialLoad(false);
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
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
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
    }
  };

  const fetchQuarterlyRocks = async () => {
    try {
      setLoadingRocks(true);
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      if (!orgId || !teamId) return;
      
      const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId);
      setQuarterlyRocks(data.companyPriorities || []);
    } catch (error) {
      console.error('Failed to fetch quarterly rocks:', error);
      setQuarterlyRocks([]);
    } finally {
      setLoadingRocks(false);
    }
  };

  const fetchLeadershipBlueprint = async () => {
    if (!leadershipTeamId) return;
    
    try {
      setLoadingLeadership(true);
      // Temporarily override the selected department in localStorage to fetch leadership data
      const currentDept = localStorage.getItem('selectedDepartment');
      const leadershipDept = availableDepartments.find(d => d.is_leadership_team);
      
      if (leadershipDept) {
        localStorage.setItem('selectedDepartment', JSON.stringify(leadershipDept));
        const data = await businessBlueprintService.getBusinessBlueprint();
        
        // Also fetch leadership rocks
        const orgId = user?.organizationId || user?.organization_id;
        let leadershipRocks = [];
        try {
          const rocksData = await quarterlyPrioritiesService.getCurrentPriorities(orgId, leadershipTeamId);
          leadershipRocks = rocksData.companyPriorities || [];
        } catch (e) {
          console.error('Failed to fetch leadership rocks:', e);
        }
        
        // Restore original department
        if (currentDept) {
          localStorage.setItem('selectedDepartment', currentDept);
        }
        
        // Transform the leadership data
        setLeadershipBlueprintData({
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
            ].filter(d => d),
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
          quarterlyRocks: leadershipRocks,
          longTermIssues: data.longTermIssues || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch leadership blueprint:', error);
      setError('Failed to load Leadership Team data');
    } finally {
      setLoadingLeadership(false);
    }
  };

  // ========== SAVE HANDLERS ==========

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

  // Core Focus handler
  const handleSaveCoreFocus = async () => {
    try {
      setSaving(true);
      setError(null);
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
      
      const transformedData = savedData ? {
        ...savedData,
        lookLikeItems: savedData.what_does_it_look_like ? 
          JSON.parse(savedData.what_does_it_look_like) : [],
        completions: savedData.what_does_it_look_like_completions || {}
      } : data;
      
      setBlueprintData(prev => ({
        ...prev,
        threeYearPicture: transformedData
      }));
      setSuccess('3-Year Picture updated successfully');
      setTimeout(() => fetchBusinessBlueprint(), 500);
    } catch (error) {
      setError('Failed to update 3-Year Picture');
      throw error;
    } finally {
      setSaving(false);
    }
  };
  
  // Handler for toggling lookLike item checkboxes
  const handleToggleLookLikeItem = async (index) => {
    if (isReadOnly) return;
    try {
      await businessBlueprintService.toggleThreeYearItem(index);
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
    if (isReadOnly) return;
    try {
      if (!goalId) return;
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
      setBlueprintData(prev => ({
        ...prev,
        oneYearPlan: {
          ...savedData,
          revenue: savedData.revenue_target || '',
          profit: savedData.profit_percentage || '',
          goals: savedData.goals && Array.isArray(savedData.goals) ? 
            savedData.goals.map(goal => {
              if (typeof goal === 'object' && goal !== null) return goal;
              if (typeof goal === 'string') return { goal_text: goal };
              return goal;
            }) : [],
          measurables: savedData.measurables || [],
          revenueStreams: savedData.revenueStreams || []
        }
      }));
      setSuccess('1-Year Plan updated successfully');
    } catch (error) {
      setError('Failed to update 1-Year Plan');
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
      
      const data = await annualPlanningGoalsService.getPlanningGoals(organizationId, teamId, nextYear);
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
      
      await annualPlanningGoalsService.savePlanningGoals(organizationId, teamId, nextYear, updatedGoals);
      setDraftGoals({ ...draftGoals, goals: updatedGoals });
      setShowDraftGoalsModal(false);
      setSuccess('Draft goals saved successfully');
    } catch (error) {
      console.error('Error saving draft goals:', error);
      setError('Failed to save draft goals');
    }
  };

  // Leadership Team toggle handler
  const handleToggleLeadershipView = () => {
    if (!viewingLeadershipTeam) {
      // Switching to leadership view
      setViewingLeadershipTeam(true);
      if (!leadershipBlueprintData) {
        fetchLeadershipBlueprint();
      }
    } else {
      setViewingLeadershipTeam(false);
    }
  };

  // ========== HELPER: Get display data (either own or leadership) ==========
  const displayData = viewingLeadershipTeam && leadershipBlueprintData ? leadershipBlueprintData : blueprintData;
  const displayRocks = viewingLeadershipTeam && leadershipBlueprintData ? (leadershipBlueprintData.quarterlyRocks || []) : quarterlyRocks;

  // ========== RENDER HELPERS ==========

  // Editable section wrapper - shows edit icon on hover
  const EditableSection = ({ children, onEdit, title, icon: Icon, description, className = '' }) => {
    const canEdit = !isReadOnly;
    return (
      <Card className={`group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}>
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
              <div className="p-1.5 rounded-lg mr-2.5" style={{ background: `${themeColors.primary}15` }}>
                <Icon className="h-4 w-4" style={{ color: themeColors.primary }} />
              </div>
              {title}
            </CardTitle>
            {canEdit && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
              >
                <Edit className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-1 ml-9">{description}</p>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {children}
        </CardContent>
      </Card>
    );
  };

  // Empty state placeholder
  const EmptyState = ({ message, onAction, actionLabel }) => (
    <div className="text-center py-6">
      <p className="text-sm text-gray-400 mb-3">{message}</p>
      {onAction && !isReadOnly && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAction}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {actionLabel || 'Add'}
        </Button>
      )}
    </div>
  );

  // ========== LOADING STATE ==========
  if (loading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: themeColors.primary }} />
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-gray-50/50 relative">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3"
                 style={{
                   background: `${themeColors.primary}10`,
                   color: themeColors.primary
                 }}>
              <Building2 className="h-3.5 w-3.5" />
              {viewingLeadershipTeam ? 'LEADERSHIP TEAM VIEW' : 'STRATEGIC PLANNING'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {labels.business_blueprint_label || '2-Page Plan'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {viewingLeadershipTeam 
                ? 'Viewing Leadership Team\'s vision and strategy (read-only)'
                : 'Define your organization\'s vision and strategy for success'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3 no-print">
            {/* Leadership Team Toggle - only show for non-leadership departments */}
            {isDepartmentView && leadershipTeamId && (
              <Button
                variant={viewingLeadershipTeam ? "default" : "outline"}
                size="sm"
                onClick={handleToggleLeadershipView}
                className={`transition-all duration-200 ${
                  viewingLeadershipTeam 
                    ? 'text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 border-gray-200'
                }`}
                style={{
                  backgroundColor: viewingLeadershipTeam ? themeColors.primary : undefined
                }}
              >
                <Shield className="h-4 w-4 mr-2" />
                {viewingLeadershipTeam ? 'Viewing Leadership' : 'View Leadership VTO'}
              </Button>
            )}
            
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-900 border-gray-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Read-only banner when viewing leadership */}
        {viewingLeadershipTeam && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border"
               style={{ 
                 backgroundColor: `${themeColors.primary}08`,
                 borderColor: `${themeColors.primary}30`
               }}>
            <Eye className="h-4 w-4 flex-shrink-0" style={{ color: themeColors.primary }} />
            <p className="text-sm" style={{ color: themeColors.primary }}>
              You are viewing the <strong>Leadership Team's</strong> {labels.business_blueprint_label || '2-Page Plan'}. 
              This is read-only. Switch back to edit your department's plan.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingLeadershipTeam(false)}
              className="ml-auto text-xs"
              style={{ color: themeColors.primary }}
            >
              Back to my plan
            </Button>
          </div>
        )}

        {/* Loading leadership data */}
        {loadingLeadership && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" style={{ color: themeColors.primary }} />
            <span className="text-sm text-gray-500">Loading Leadership Team data...</span>
          </div>
        )}

        {/* Status messages */}
        {error && (
          <Alert className="border-red-200 bg-red-50 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* ===== TWO-COLUMN LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ===== LEFT COLUMN: VISION ===== */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: themeColors.primary }}></div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: themeColors.primary }}>
                {tabLabels.vision}
              </h2>
            </div>

            {/* --- Core Values --- */}
            <EditableSection 
              title={frameworkSections.coreValues.label}
              icon={Users}
              description={frameworkSections.coreValues.description}
              onEdit={handleAddCoreValue}
            >
              {displayData.coreValues && displayData.coreValues.length > 0 ? (
                <div className="space-y-2">
                  {displayData.coreValues.map((value) => (
                    <div key={value.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group/item hover:bg-gray-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900">{value.value}</h4>
                        {value.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{value.description}</p>
                        )}
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity ml-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCoreValue(value)} className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCoreValue(value.id)} className="h-7 w-7 p-0 hover:text-red-500">
                            <Trash2 className="h-3 w-3 text-gray-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!isReadOnly && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleAddCoreValue}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Core Value
                    </Button>
                  )}
                </div>
              ) : (
                <EmptyState 
                  message="No core values defined yet" 
                  onAction={handleAddCoreValue}
                  actionLabel="Add Core Value"
                />
              )}
            </EditableSection>

            {/* --- Core Focus --- */}
            <EditableSection 
              title={frameworkSections.coreFocus.label}
              icon={Target}
              description={frameworkSections.coreFocus.description}
              onEdit={!editingCoreFocus ? () => setEditingCoreFocus(true) : undefined}
            >
              {editingCoreFocus && !isReadOnly ? (
                /* Inline Edit Form */
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500">Focus type</Label>
                    <RadioGroup
                      value={blueprintData.coreFocus.hedgehogType}
                      onValueChange={(value) => setBlueprintData(prev => ({
                        ...prev,
                        coreFocus: { ...prev.coreFocus, hedgehogType: value }
                      }))}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="purpose" id="purpose" />
                        <Label htmlFor="purpose" className="text-sm">Purpose</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="cause" id="cause" />
                        <Label htmlFor="cause" className="text-sm">Cause</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="passion" id="passion" />
                        <Label htmlFor="passion" className="text-sm">Passion</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="hedgehog-description" className="text-xs text-gray-500">
                      {blueprintData.coreFocus.hedgehogType === 'purpose' ? 'Purpose' : 
                       blueprintData.coreFocus.hedgehogType === 'cause' ? 'Cause' : 'Passion'}
                    </Label>
                    <Textarea
                      id="hedgehog-description"
                      value={blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType]}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        coreFocus: { ...prev.coreFocus, [prev.coreFocus.hedgehogType]: e.target.value }
                      }))}
                      placeholder={`Enter your ${blueprintData.coreFocus.hedgehogType}...`}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="niche" className="text-xs text-gray-500">{frameworkSections.coreFocus.nicheLabel || 'Niche'}</Label>
                    <Textarea
                      id="niche"
                      value={blueprintData.coreFocus.niche}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        coreFocus: { ...prev.coreFocus, niche: e.target.value }
                      }))}
                      placeholder="What is your niche?"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={async () => {
                        await handleSaveCoreFocus();
                        setEditingCoreFocus(false);
                      }} 
                      disabled={saving}
                      style={{ backgroundColor: themeColors.primary }} 
                      className="text-white text-xs"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingCoreFocus(false)} className="text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="space-y-3">
                  {displayData.coreFocus[displayData.coreFocus.hedgehogType] ? (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {displayData.coreFocus.hedgehogType}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">{displayData.coreFocus[displayData.coreFocus.hedgehogType]}</p>
                    </div>
                  ) : null}
                  {displayData.coreFocus.niche ? (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {frameworkSections.coreFocus.nicheLabel || 'Niche'}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">{displayData.coreFocus.niche}</p>
                    </div>
                  ) : null}
                  {!displayData.coreFocus[displayData.coreFocus.hedgehogType] && !displayData.coreFocus.niche && (
                    <EmptyState 
                      message="Core focus not defined yet" 
                      onAction={() => setEditingCoreFocus(true)}
                      actionLabel="Define Core Focus"
                    />
                  )}
                </div>
              )}
            </EditableSection>

            {/* --- 10-Year Target / BHAG --- */}
            <EditableSection 
              title={frameworkSections.tenYearTarget.label}
              icon={TrendingUp}
              description={frameworkSections.tenYearTarget.description}
              onEdit={!editingBHAG ? () => setEditingBHAG(true) : undefined}
            >
              {editingBHAG && !isReadOnly ? (
                /* Inline Edit Form */
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bhag-year" className="text-xs text-gray-500">Target Year</Label>
                    <Input
                      id="bhag-year"
                      type="number"
                      value={blueprintData.bhag.year}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        bhag: { ...prev.bhag, year: parseInt(e.target.value) || '' }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bhag-description" className="text-xs text-gray-500">Vision Description</Label>
                    <Textarea
                      id="bhag-description"
                      value={blueprintData.bhag.description}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        bhag: { ...prev.bhag, description: e.target.value }
                      }))}
                      placeholder="Describe your long-term vision..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bhag-running" className="text-xs text-gray-500">Running Total</Label>
                    <Input
                      id="bhag-running"
                      value={blueprintData.bhag.runningTotal}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        bhag: { ...prev.bhag, runningTotal: e.target.value }
                      }))}
                      placeholder="e.g., $50M revenue"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={async () => {
                        await handleSaveBHAG();
                        setEditingBHAG(false);
                      }} 
                      disabled={saving}
                      style={{ backgroundColor: themeColors.primary }} 
                      className="text-white text-xs"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingBHAG(false)} className="text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="space-y-3">
                  {displayData.bhag.year && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Target Year</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{displayData.bhag.year}</p>
                    </div>
                  )}
                  {displayData.bhag.description && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Vision</p>
                      <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{displayData.bhag.description}</p>
                    </div>
                  )}
                  {displayData.bhag.runningTotal && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Running Total</p>
                      <p className="text-sm text-gray-700 mt-0.5">{displayData.bhag.runningTotal}</p>
                    </div>
                  )}
                  {!displayData.bhag.description && !displayData.bhag.year && (
                    <EmptyState 
                      message="Long-range target not defined yet" 
                      onAction={() => setEditingBHAG(true)}
                      actionLabel="Set Target"
                    />
                  )}
                </div>
              )}
            </EditableSection>

            {/* --- Marketing Strategy --- */}
            <EditableSection 
              title={frameworkSections.marketingStrategy.label}
              icon={Lightbulb}
              description={frameworkSections.marketingStrategy.description}
              onEdit={!editingMarketingStrategy ? () => setEditingMarketingStrategy(true) : undefined}
            >
              {editingMarketingStrategy && !isReadOnly ? (
                /* Inline Edit Form */
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 font-semibold">{frameworkSections.marketingStrategy.targetMarketLabel || 'Target Market'}</Label>
                    <div className="space-y-3 mt-2">
                      <div>
                        <Label htmlFor="demographicProfile" className="text-xs text-gray-400">Demographic</Label>
                        <Textarea
                          id="demographicProfile"
                          value={blueprintData.marketingStrategy.demographicProfile}
                          onChange={(e) => setBlueprintData(prev => ({
                            ...prev,
                            marketingStrategy: { ...prev.marketingStrategy, demographicProfile: e.target.value }
                          }))}
                          placeholder="Age, income, education level, occupation..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="geographicProfile" className="text-xs text-gray-400">Geographic</Label>
                        <Textarea
                          id="geographicProfile"
                          value={blueprintData.marketingStrategy.geographicProfile}
                          onChange={(e) => setBlueprintData(prev => ({
                            ...prev,
                            marketingStrategy: { ...prev.marketingStrategy, geographicProfile: e.target.value }
                          }))}
                          placeholder="Location, region, urban/suburban/rural..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="psychographicProfile" className="text-xs text-gray-400">Psychographic</Label>
                        <Textarea
                          id="psychographicProfile"
                          value={blueprintData.marketingStrategy.psychographicProfile}
                          onChange={(e) => setBlueprintData(prev => ({
                            ...prev,
                            marketingStrategy: { ...prev.marketingStrategy, psychographicProfile: e.target.value }
                          }))}
                          placeholder="Lifestyle, values, interests, behaviors..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-gray-500 font-semibold">{frameworkSections.marketingStrategy.differentiatorsLabel || 'Differentiators'} (3-5)</Label>
                      {blueprintData.marketingStrategy.differentiators.length < 5 && (
                        <Button
                          type="button" size="sm" variant="ghost"
                          onClick={() => setBlueprintData(prev => ({
                            ...prev,
                            marketingStrategy: {
                              ...prev.marketingStrategy,
                              differentiators: [...prev.marketingStrategy.differentiators, '']
                            }
                          }))}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
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
                                marketingStrategy: { ...prev.marketingStrategy, differentiators: newDifferentiators }
                              };
                            })}
                            className="text-sm"
                          />
                          {blueprintData.marketingStrategy.differentiators.length > 3 && (
                            <Button type="button" size="sm" variant="ghost"
                              onClick={() => setBlueprintData(prev => ({
                                ...prev,
                                marketingStrategy: {
                                  ...prev.marketingStrategy,
                                  differentiators: prev.marketingStrategy.differentiators.filter((_, i) => i !== index)
                                }
                              }))}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">{frameworkSections.marketingStrategy.provenProcessLabel || 'Proven Process'}</Label>
                    <Switch
                      checked={blueprintData.marketingStrategy.provenProcessExists}
                      onCheckedChange={(checked) => setBlueprintData(prev => ({
                        ...prev,
                        marketingStrategy: { ...prev.marketingStrategy, provenProcessExists: checked }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-500">Guarantee</Label>
                      <Switch
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
                        className="text-sm"
                      />
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={async () => {
                        await handleSaveMarketingStrategy();
                        setEditingMarketingStrategy(false);
                      }} 
                      disabled={saving}
                      style={{ backgroundColor: themeColors.primary }} 
                      className="text-white text-xs"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingMarketingStrategy(false)} className="text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="space-y-3">
                  {/* Target Market */}
                  {(displayData.marketingStrategy.demographicProfile || 
                    displayData.marketingStrategy.geographicProfile || 
                    displayData.marketingStrategy.psychographicProfile ||
                    displayData.marketingStrategy.targetMarket) ? (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                        {frameworkSections.marketingStrategy.targetMarketLabel || 'Target Market'}
                      </p>
                      {displayData.marketingStrategy.demographicProfile && (
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Demographic</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayData.marketingStrategy.demographicProfile}</p>
                        </div>
                      )}
                      {displayData.marketingStrategy.geographicProfile && (
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Geographic</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayData.marketingStrategy.geographicProfile}</p>
                        </div>
                      )}
                      {displayData.marketingStrategy.psychographicProfile && (
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Psychographic</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayData.marketingStrategy.psychographicProfile}</p>
                        </div>
                      )}
                      {displayData.marketingStrategy.targetMarket && 
                       !displayData.marketingStrategy.demographicProfile && 
                       !displayData.marketingStrategy.geographicProfile && 
                       !displayData.marketingStrategy.psychographicProfile && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayData.marketingStrategy.targetMarket}</p>
                      )}
                    </div>
                  ) : null}
                  
                  {/* Differentiators */}
                  {displayData.marketingStrategy.differentiators && displayData.marketingStrategy.differentiators.filter(d => d).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                        {frameworkSections.marketingStrategy.differentiatorsLabel || 'Differentiators'}
                      </p>
                      <ul className="space-y-1">
                        {displayData.marketingStrategy.differentiators.filter(d => d).map((diff, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <span className="mr-2" style={{ color: themeColors.primary }}>•</span>
                            <span className="text-gray-700">{diff}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Proven Process */}
                  {displayData.marketingStrategy.provenProcessExists && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm text-gray-600">Proven Process</span>
                    </div>
                  )}
                  
                  {/* Guarantee */}
                  {displayData.marketingStrategy.guaranteeExists && (
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-sm text-gray-600">Guarantee</span>
                      </div>
                      {displayData.marketingStrategy.guaranteeDescription && (
                        <p className="text-xs text-gray-500 ml-5 mt-0.5">{displayData.marketingStrategy.guaranteeDescription}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Empty state */}
                  {!displayData.marketingStrategy.targetMarket && 
                   !displayData.marketingStrategy.demographicProfile &&
                   !displayData.marketingStrategy.geographicProfile &&
                   !displayData.marketingStrategy.psychographicProfile &&
                   !displayData.marketingStrategy.differentiators?.some(d => d) &&
                   !displayData.marketingStrategy.provenProcessExists &&
                   !displayData.marketingStrategy.guaranteeExists && (
                    <EmptyState 
                      message="Marketing strategy not defined yet" 
                      onAction={() => setEditingMarketingStrategy(true)}
                      actionLabel="Define Strategy"
                    />
                  )}
                </div>
              )}
            </EditableSection>
          </div>

          {/* ===== RIGHT COLUMN: TRACTION / EXECUTION ===== */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: themeColors.secondary || themeColors.primary }}></div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: themeColors.secondary || themeColors.primary }}>
                {tabLabels.execution}
              </h2>
            </div>

            {/* --- 3-Year Picture --- */}
            <EditableSection 
              title={frameworkSections.threeYearPicture.label}
              icon={Calendar}
              description={frameworkSections.threeYearPicture.description}
              onEdit={() => setShowThreeYearDialog(true)}
            >
              {displayData.threeYearPicture ? (
                <div className="space-y-3">
                  {/* Target Date */}
                  {displayData.threeYearPicture.future_date && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Target Date</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {(() => {
                          const [year, month, day] = displayData.threeYearPicture.future_date.split('T')[0].split('-');
                          const date = new Date(year, month - 1, day, 12, 0, 0);
                          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        })()}
                      </p>
                    </div>
                  )}
                  
                  {/* Financial Goals */}
                  {(displayData.threeYearPicture.revenue_target || displayData.threeYearPicture.profit_target || 
                    (displayData.threeYearPicture.revenueStreams && displayData.threeYearPicture.revenueStreams.length > 0)) && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Financial Goals</p>
                      {displayData.threeYearPicture.revenueStreams && displayData.threeYearPicture.revenueStreams.length > 0 ? (
                        <div className="space-y-1">
                          {displayData.threeYearPicture.revenueStreams.map((stream, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{stream.name}</span>
                              <span className="font-medium text-gray-900">{formatCurrency(stream.revenue_target) || 'Not set'}</span>
                            </div>
                          ))}
                        </div>
                      ) : displayData.threeYearPicture.revenue_target ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{getRevenueLabelWithSuffix(organization, 'Target')}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(displayData.threeYearPicture.revenue_target)}</span>
                        </div>
                      ) : null}
                      {displayData.threeYearPicture.profit_target && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Profit Target</span>
                          <span className="font-medium text-gray-900">{displayData.threeYearPicture.profit_target}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Key Measurables */}
                  {displayData.threeYearPicture.measurables?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Key Measurables</p>
                      <div className="space-y-1">
                        {displayData.threeYearPicture.measurables.map((m, index) => (
                          <div key={m.id || index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{typeof m === 'string' ? m : (m.name || m.metric_name || '')}</span>
                            <span className="font-medium text-gray-900">{typeof m === 'string' ? '' : (m.value || m.target_value || '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* What does it look like? */}
                  {(() => {
                    const lookLikeData = displayData.threeYearPicture?.lookLikeItems || 
                      (displayData.threeYearPicture?.what_does_it_look_like && 
                       typeof displayData.threeYearPicture.what_does_it_look_like === 'string' 
                         ? JSON.parse(displayData.threeYearPicture.what_does_it_look_like)
                         : displayData.threeYearPicture?.what_does_it_look_like) || [];
                    const filteredItems = Array.isArray(lookLikeData) ? lookLikeData.filter(item => item) : [];
                    
                    return filteredItems.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">What does it look like?</p>
                        <ul className="space-y-1.5">
                          {filteredItems.map((item, index) => {
                            const isChecked = lookLikeCheckedItems[index] || false;
                            return (
                              <li key={index} className="flex items-start gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleLookLikeItem(index)}
                                  disabled={isReadOnly}
                                  className="mt-0.5"
                                />
                                <span className={`text-sm text-gray-700 ${isChecked ? 'line-through opacity-50' : ''}`}>
                                  {item}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <EmptyState 
                  message="3-Year Picture not defined yet" 
                  onAction={() => setShowThreeYearDialog(true)}
                  actionLabel="Create 3-Year Picture"
                />
              )}
            </EditableSection>

            {/* --- 1-Year Plan --- */}
            <EditableSection 
              title={frameworkSections.oneYearPlan.label}
              icon={Target}
              description={frameworkSections.oneYearPlan.description}
              onEdit={() => setShowOneYearDialog(true)}
            >
              {displayData.oneYearPlan ? (
                <div className="space-y-3">
                  {/* Financial targets */}
                  {(displayData.oneYearPlan.revenue_target || displayData.oneYearPlan.profit_percentage || 
                    (displayData.oneYearPlan.revenueStreams && displayData.oneYearPlan.revenueStreams.length > 0)) && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Financial Targets</p>
                      {displayData.oneYearPlan.revenueStreams && displayData.oneYearPlan.revenueStreams.length > 0 ? (
                        <div className="space-y-1">
                          {displayData.oneYearPlan.revenueStreams.map((stream, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{stream.name}</span>
                              <span className="font-medium text-gray-900">{formatCurrency(stream.revenue_target) || 'Not set'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          {displayData.oneYearPlan.revenue_target && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Revenue Target</span>
                              <span className="font-medium text-gray-900">{formatCurrency(displayData.oneYearPlan.revenue_target)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {displayData.oneYearPlan.profit_percentage && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Profit Target</span>
                          <span className="font-medium text-gray-900">{displayData.oneYearPlan.profit_percentage}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Key Measurables */}
                  {displayData.oneYearPlan.measurables?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Key Measurables</p>
                      <div className="space-y-1">
                        {displayData.oneYearPlan.measurables.map((m, index) => (
                          <div key={m.id || index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{typeof m === 'string' ? m : (m.name || m.metric_name || '')}</span>
                            <span className="font-medium text-gray-900">{typeof m === 'string' ? '' : (m.value || m.target_value || '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Goals */}
                  {displayData.oneYearPlan.goals && displayData.oneYearPlan.goals.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Goals</p>
                      <ul className="space-y-1.5">
                        {displayData.oneYearPlan.goals.filter(goal => {
                          if (typeof goal === 'object' && goal !== null && goal.goal_text) return true;
                          if (typeof goal === 'string' && goal.trim()) return true;
                          return false;
                        }).map((goal, index) => {
                          const isChecked = oneYearGoalsCheckedItems[index] || false;
                          const goalText = typeof goal === 'string' ? goal : goal.goal_text;
                          const goalId = typeof goal === 'object' ? goal.id : null;
                          return (
                            <li key={goal.id || index} className="flex items-start gap-2">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggleOneYearGoal(goalId, index)}
                                disabled={isReadOnly}
                                className="mt-0.5"
                              />
                              <span className={`text-sm text-gray-700 ${isChecked ? 'line-through opacity-50' : ''}`}>
                                {goalText}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState 
                  message="1-Year Plan not defined yet" 
                  onAction={() => setShowOneYearDialog(true)}
                  actionLabel="Create 1-Year Plan"
                />
              )}
            </EditableSection>

            {/* --- Quarterly Rocks --- */}
            <EditableSection 
              title={isEOS ? 'Quarterly Rocks' : `Quarterly ${labels.priorities_label || 'Priorities'}`}
              icon={Rocket}
              description={isEOS ? 'Current quarter\'s most important priorities' : 'Current quarter\'s key priorities'}
              onEdit={null} // No edit - rocks are managed on the Rocks page
            >
              {displayRocks && displayRocks.length > 0 ? (
                <div className="space-y-2">
                  {displayRocks.map((rock, index) => {
                    const status = rock.status || rock.prediction || 'on_track';
                    const statusColors = {
                      'on_track': 'bg-green-100 text-green-700',
                      'off_track': 'bg-red-100 text-red-700',
                      'at_risk': 'bg-yellow-100 text-yellow-700',
                      'done': 'bg-blue-100 text-blue-700',
                      'complete': 'bg-blue-100 text-blue-700'
                    };
                    const statusLabels = {
                      'on_track': 'On Track',
                      'off_track': 'Off Track',
                      'at_risk': 'At Risk',
                      'done': 'Done',
                      'complete': 'Complete'
                    };
                    return (
                      <div key={rock.id || index} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{rock.title || rock.name}</p>
                          {rock.owner_name && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {rock.owner_name}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[status] || status}
                        </span>
                      </div>
                    );
                  })}
                  {!isReadOnly && (
                    <Link 
                      to="/quarterly-priorities" 
                      className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2 py-1"
                    >
                      Manage {isEOS ? 'Rocks' : labels.priorities_label || 'Priorities'}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : loadingRocks ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">No quarterly {isEOS ? 'rocks' : 'priorities'} set</p>
                  {!isReadOnly && (
                    <Link to="/quarterly-priorities">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Add {isEOS ? 'Rocks' : labels.priorities_label || 'Priorities'}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </EditableSection>

            {/* --- Draft Next Year Goals --- */}
            {!isReadOnly && draftGoals && draftGoals.goals && draftGoals.goals.length > 0 && (
              <Card className="bg-blue-50/80 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg font-semibold text-blue-900">
                      <div className="p-1.5 rounded-lg mr-2.5 bg-blue-100">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      {new Date().getFullYear() + 1} Goals (Draft)
                    </CardTitle>
                    <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-[10px] font-medium">
                      Draft
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-1.5 mb-3">
                    {draftGoals.goals.map((goal, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{goal}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mb-3">
                    These goals will automatically replace {new Date().getFullYear()} goals on January 1, {new Date().getFullYear() + 1}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowDraftGoalsModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Edit Draft Goals
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ===== DIALOGS ===== */}
      {!isReadOnly && (
        <>
          <CoreValueDialog
            open={showCoreValueDialog}
            onOpenChange={setShowCoreValueDialog}
            value={editingCoreValue}
            onSave={editingCoreValue ? handleSaveCoreValue : handleSaveNewCoreValue}
          />

          <ThreeYearPictureDialog
            open={showThreeYearDialog}
            onOpenChange={setShowThreeYearDialog}
            data={blueprintData.threeYearPicture}
            onSave={handleSaveThreeYearPicture}
            organization={organization}
          />

          <OneYearPlanDialog
            open={showOneYearDialog}
            onOpenChange={setShowOneYearDialog}
            data={blueprintData.oneYearPlan}
            onSave={handleSaveOneYearPlan}
            organization={organization}
          />
        </>
      )}

      <DraftGoalsEditModal
        isOpen={showDraftGoalsModal}
        onClose={() => setShowDraftGoalsModal(false)}
        goals={draftGoals?.goals || []}
        year={new Date().getFullYear() + 1}
        onSave={handleSaveDraftGoals}
      />
    </div>
  );
};

export default BusinessBlueprintPage;
