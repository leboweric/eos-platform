import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTerminology } from '../contexts/TerminologyContext';
import { aiRockAssistantService } from '../services/aiRockAssistantService';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { teamsService } from '../services/teamsService';
import { userService } from '../services/userService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';
import { organizationService } from '../services/organizationService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TeamMemberSelect from '../components/shared/TeamMemberSelect';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Target, 
  Calendar,
  Users,
  ArrowRight,
  Loader2,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';

const SmartRockAssistant = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { labels } = useTerminology();
  
  // Theme colors
  const tabsRef = useRef(null);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Apply theme colors to active tabs
  useEffect(() => {
    if (tabsRef.current) {
      const observer = new MutationObserver(() => {
        const triggers = tabsRef.current?.querySelectorAll('[role="tab"]');
        triggers?.forEach(trigger => {
          if (trigger.getAttribute('data-state') === 'active') {
            trigger.style.background = `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`;
          } else {
            trigger.style.background = 'transparent';
          }
        });
      });
      
      observer.observe(tabsRef.current, {
        attributes: true,
        attributeFilter: ['data-state'],
        subtree: true
      });
      
      // Initial check
      setTimeout(() => {
        const triggers = tabsRef.current?.querySelectorAll('[role="tab"]');
        triggers?.forEach(trigger => {
          if (trigger.getAttribute('data-state') === 'active') {
            trigger.style.background = `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`;
          }
        });
      }, 100);
      
      return () => observer.disconnect();
    }
  }, [themeColors]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
        if (!orgId) return;
        
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme && savedTheme.primary && savedTheme.secondary) {
          setThemeColors(savedTheme);
        } else {
          try {
            const orgData = await organizationService.getOrganization();
            if (orgData && orgData.theme_primary_color) {
              const theme = {
                primary: orgData.theme_primary_color || '#3B82F6',
                secondary: orgData.theme_secondary_color || '#1E40AF',
                accent: orgData.theme_accent_color || '#60A5FA'
              };
              setThemeColors(theme);
              saveOrgTheme(orgId, theme);
            }
          } catch (fetchError) {
            console.error('Failed to fetch organization theme:', fetchError);
          }
        }
      } catch (error) {
        console.error('Error loading theme colors:', error);
      }
    };
    
    loadTheme();
  }, [user]);
  
  // Step tracking - Start at step 0 (vision input)
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Configuration check
  const [isConfigured, setIsConfigured] = useState(null);
  const [configError, setConfigError] = useState(null);
  
  // Vision-based workflow state
  const [vision, setVision] = useState('');
  const [challenges, setChallenges] = useState('');
  const [strategicFocus, setStrategicFocus] = useState([]);
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  
  // Rock data
  const [rockData, setRockData] = useState({
    title: '',
    description: '',
    owner: user?.id || '',
    teamId: '',
    quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
    year: new Date().getFullYear(),
    dueDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    type: 'individual' // 'company' or 'individual'
  });
  
  // AI Analysis
  const [smartAnalysis, setSmartAnalysis] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [alignment, setAlignment] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  
  // Teams and users
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Check AI configuration
  useEffect(() => {
    checkAIConfiguration();
    loadInitialData();
  }, [orgId]);

  const checkAIConfiguration = async () => {
    try {
      const result = await aiRockAssistantService.checkConfiguration(orgId);
      setIsConfigured(result.configured);
      if (!result.configured) {
        setConfigError(result.error || 'AI service not configured');
      }
    } catch (error) {
      setIsConfigured(false);
      setConfigError('Failed to check AI configuration');
    }
  };

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [teamsData, usersData] = await Promise.all([
        teamsService.getTeams(orgId),
        userService.getOrganizationUsers(orgId)
      ]);
      setTeams(teamsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const analyzeRock = async () => {
    if (!rockData.title) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const result = await aiRockAssistantService.analyzeRock(orgId, {
        title: rockData.title,
        description: rockData.description,
        saveAnalysis: true
      });
      
      if (result.success) {
        setSmartAnalysis(result.analysis);
      }
    } catch (error) {
      setAnalysisError('Failed to analyze Rock');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateMilestones = async () => {
    setIsAnalyzing(true);
    try {
      const result = await aiRockAssistantService.suggestMilestones(orgId, {
        title: rockData.title,
        description: rockData.description,
        dueDate: rockData.dueDate,
        startDate: new Date().toISOString()
      });
      
      if (result.success) {
        setMilestones(result.milestones);
      }
    } catch (error) {
      console.error('Milestone generation error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkAlignment = async () => {
    if (rockData.type !== 'individual') return;
    
    setIsAnalyzing(true);
    try {
      const result = await aiRockAssistantService.checkAlignment(orgId, rockData.teamId, {
        title: rockData.title,
        description: rockData.description
      });
      
      if (result.success) {
        setAlignment(result.alignment);
      }
    } catch (error) {
      console.error('Alignment check error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = () => {
    if (smartAnalysis?.suggestedRewrite) {
      setRockData({
        ...rockData,
        title: smartAnalysis.suggestedRewrite.title,
        description: smartAnalysis.suggestedRewrite.description
      });
      // Re-analyze with new content
      setTimeout(analyzeRock, 500);
    }
  };

  // New vision-based workflow functions
  const handleGenerateOptions = async () => {
    if (!vision || !rockData.teamId) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const result = await aiRockAssistantService.generateFromVision(orgId, {
        vision,
        teamId: rockData.teamId,
        challenges,
        strategicFocus
      });
      
      if (result.success) {
        setGeneratedOptions(result.options);
        setCurrentStep(1); // Move to new Step 1 (Options Review)
      } else {
        setAnalysisError('Failed to generate Rock options.');
      }
    } catch (error) {
      setAnalysisError(error.response?.data?.error || 'An error occurred.');
      console.error('Generation error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    // Pre-populate the main rockData state with the selected option
    setRockData({
      ...rockData, // Keep teamId, quarter, year
      title: option.title,
      description: option.description,
      owner: user?.id || '' // Reset owner or keep if already set
    });
    setMilestones(option.milestones || []);
    setCurrentStep(2); // Move to new Step 2 (Refinement)
  };

  const saveRock = async () => {
    try {
      // Create the Rock with milestones
      const rockPayload = {
        ...rockData,
        milestones: milestones.map(m => ({
          title: m.title,
          dueDate: m.dueDate,
          completed: false
        }))
      };
      
      await quarterlyPrioritiesService.createPriority(
        orgId,
        rockData.teamId || teams.find(t => t.is_leadership_team)?.id,
        rockPayload
      );
      
      // Show success notification
      toast.success('SMART Rock created successfully!', {
        description: `"${rockData.title}" has been added to your quarterly priorities.`
      });
    } catch (error) {
      console.error('Error saving Rock:', error);
      toast.error('Failed to create Rock', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const nextStep = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    setCurrentStep(currentStep + 1);
    
    // New workflow:
    // Step 0 -> 1 is handled by handleGenerateOptions (manual)
    // Step 1 -> 2 is handled by handleSelectOption (manual)
    
    // Trigger analysis when moving from step 2 to step 3 (old step 1 -> 2)
    if (currentStep === 2 && rockData.title) {
      analyzeRock();
    }
    // Generate milestones when moving from step 3 to step 4 (old step 2 -> 3)
    if (currentStep === 3) {
      generateMilestones();
    }
    // Check alignment when moving from step 4 to step 5 (old step 3 -> 4)
    if (currentStep === 4 && rockData.type === 'individual') {
      checkAlignment();
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const getSmartScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSmartScoreBadge = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (isConfigured === false) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>AI Service Not Configured</AlertTitle>
          <AlertDescription>
            {configError || 'Please add your OpenAI API key to use the SMART Rock Assistant.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadingData || isConfigured === null) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 backdrop-blur-sm" style={{
                backgroundColor: hexToRgba(themeColors.primary, 0.1),
                color: themeColors.primary
              }}>
                <Brain className="h-4 w-4" />
                AI ASSISTANT
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(`/organizations/${orgId}/quarterly-priorities`)}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.15)} 0%, ${hexToRgba(themeColors.secondary, 0.15)} 100%)`
            }}>
              <Brain className="h-8 w-8" style={{ color: themeColors.primary }} />
            </div>
            SMART {labels.rock_singular} Assistant
          </h1>
          <p className="text-lg text-slate-600">
            Create {labels.rocks} that are Specific, Measurable, Achievable, Relevant, and Time-bound
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600">Step {currentStep + 1} of 6</span>
            {smartAnalysis && (
              <Badge className={getSmartScoreBadge(smartAnalysis.overallScore)}>
                SMART Score: {smartAnalysis.overallScore}%
              </Badge>
            )}
          </div>
          <Progress value={((currentStep + 1) / 6) * 100} className="h-3 bg-slate-100" />
        </div>

        {/* Step 0: Vision Input (New First Step) */}
        {currentStep === 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.accent, 0.15)} 0%, ${hexToRgba(themeColors.secondary, 0.15)} 100%)`
                }}>
                  <Sparkles className="h-5 w-5" style={{ color: themeColors.accent }} />
                </div>
                Step 1: Envision Success
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Start with the end in mind. What does great look like at the end of the quarter?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Team Select Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="team" className="text-sm font-semibold text-slate-700">Team*</Label>
                <Select
                  value={rockData.teamId}
                  onValueChange={(value) => setRockData({ ...rockData, teamId: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} {team.is_leadership_team && '(Leadership)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vision Textarea */}
              <div className="space-y-2">
                <Label htmlFor="vision" className="text-sm font-semibold text-slate-700">Your Vision of Success*</Label>
                <Textarea
                  id="vision"
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Example: We've successfully onboarded 25 new clients, our team is fully trained on the new software, and client satisfaction scores are above 4.5/5..."
                  rows={6}
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
                <p className="text-sm text-muted-foreground">Describe the outcome, not the process. Be as detailed as possible.</p>
              </div>

              {/* Optional Fields */}
              <div className="space-y-2">
                <Label htmlFor="challenges" className="text-sm font-semibold text-slate-700">What challenge are you trying to solve? (Optional)</Label>
                <Textarea
                  id="challenges"
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  rows={2}
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Strategic Focus (Optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['Growth', 'Efficiency', 'Quality', 'Innovation', 'Customer Experience', 'Team Development'].map((focus) => (
                    <div key={focus} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={focus}
                        checked={strategicFocus.includes(focus)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStrategicFocus([...strategicFocus, focus]);
                          } else {
                            setStrategicFocus(strategicFocus.filter(f => f !== focus));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={focus} className="text-sm text-slate-600">{focus}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {analysisError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{analysisError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={handleGenerateOptions}
                  disabled={!vision || !rockData.teamId || isAnalyzing}
                  className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    background: !vision || !rockData.teamId || isAnalyzing
                      ? '#9CA3AF'
                      : `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                    filter: !vision || !rockData.teamId || isAnalyzing ? 'none' : undefined
                  }}
                  onMouseEnter={(e) => {
                    if (vision && rockData.teamId && !isAnalyzing) {
                      e.currentTarget.style.filter = 'brightness(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (vision && rockData.teamId && !isAnalyzing) {
                      e.currentTarget.style.filter = 'none';
                    }
                  }}
                >
                  {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate SMART Rock Options
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Review Options (New Second Step) */}
        {currentStep === 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.15)} 0%, ${hexToRgba(themeColors.secondary, 0.15)} 100%)`
                }}>
                  <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
                Step 2: Review Rock Options
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Choose the best {labels.rock_singular} option for your team
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {generatedOptions.length > 0 ? (
                <div className="space-y-4">
                  {generatedOptions.map((option, index) => (
                    <Card key={index} className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-bold text-slate-900">{option.title}</CardTitle>
                          <Badge className={getSmartScoreBadge(option.smartScore || 90)}>
                            {option.smartScore || 90}% SMART
                          </Badge>
                        </div>
                        <CardDescription className="text-slate-600">{option.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <h4 className="font-semibold mb-2 text-slate-900">Success Criteria:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 mb-4">
                          {option.successCriteria?.map((item, i) => <li key={i}>{item}</li>) || []}
                        </ul>
                        
                        {option.milestones && option.milestones.length > 0 && (
                          <details className="group">
                            <summary className="cursor-pointer font-semibold text-slate-900 hover:text-primary">
                              View Milestones ({option.milestones.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {option.milestones.map((milestone, i) => (
                                <div key={i} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                                  <span>{milestone.title}</span>
                                  <span className="font-medium">{format(new Date(milestone.dueDate), 'MMM d')}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </CardContent>
                      <div className="p-6 pt-0">
                        <Button 
                          onClick={() => handleSelectOption(option)}
                          className="w-full text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                          style={{
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                        >
                          Select This Rock
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-600">No options generated yet.</p>
                </div>
              )}
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(0)}
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                >
                  Back to Vision
                </Button>
                {generatedOptions.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={handleGenerateOptions}
                    disabled={isAnalyzing}
                    className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate New Options
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Refine Rock (Old Step 1 & 3 Combined) */}
        {currentStep === 2 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.accent, 0.15)} 0%, ${hexToRgba(themeColors.secondary, 0.15)} 100%)`
                }}>
                  <Target className="h-5 w-5" style={{ color: themeColors.accent }} />
                </div>
                Step 3: Refine Your {labels.rock_singular}
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Review and edit the selected {labels.rock_singular} before analysis.
              </CardDescription>
            </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-semibold text-slate-700">{labels.rock_singular} Title*</Label>
              <Input
                id="title"
                value={rockData.title}
                onChange={(e) => setRockData({ ...rockData, title: e.target.value })}
                placeholder="e.g., Launch new customer portal"
                className="text-lg bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }}
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              />
              <p className="text-sm text-muted-foreground">
                What do you want to accomplish this quarter?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Description (Optional)</Label>
              <Textarea
                id="description"
                value={rockData.description}
                onChange={(e) => setRockData({ ...rockData, description: e.target.value })}
                placeholder="Provide additional context or success criteria..."
                rows={4}
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }}
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold text-slate-700">{labels.rock_singular} Type</Label>
                <Select
                  value={rockData.type}
                  onValueChange={(value) => setRockData({ ...rockData, type: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="company">Company {labels.rock_singular}</SelectItem>
                    <SelectItem value="individual">Department/Individual {labels.rock_singular}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team" className="text-sm font-semibold text-slate-700">Team</Label>
                <Select
                  value={rockData.teamId}
                  onValueChange={(value) => setRockData({ ...rockData, teamId: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} {team.is_leadership_team && '(Leadership)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner" className="text-sm font-semibold text-slate-700">Owner</Label>
                <TeamMemberSelect
                  teamId={rockData.teamId}
                  value={rockData.owner}
                  onValueChange={(value) => setRockData({ ...rockData, owner: value })}
                  placeholder="Select owner"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm"
                  includeAllIfLeadership={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quarter" className="text-sm font-semibold text-slate-700">Quarter</Label>
                <Select
                  value={rockData.quarter}
                  onValueChange={(value) => setRockData({ ...rockData, quarter: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm font-semibold text-slate-700">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={rockData.year}
                  onChange={(e) => setRockData({ ...rockData, year: parseInt(e.target.value) })}
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            {/* Milestones Section (moved from old step 3) */}
            {milestones.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Milestones</h3>
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-sm text-slate-600 mt-1">{milestone.description}</p>
                          )}
                          {milestone.successCriteria && (
                            <p className="text-sm text-slate-700 mt-2">
                              <span className="font-semibold">Success Criteria:</span> {milestone.successCriteria}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm px-3 py-1.5 backdrop-blur-sm rounded-lg border ml-4" style={{
                          backgroundColor: hexToRgba(themeColors.primary, 0.05),
                          borderColor: hexToRgba(themeColors.primary, 0.2)
                        }}>
                          <Calendar className="h-4 w-4" style={{ color: themeColors.primary }} />
                          <span className="font-medium" style={{ color: themeColors.primary }}>
                            {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
                className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
              >
                Back to Options
              </Button>
              <Button 
                onClick={nextStep}
                disabled={!rockData.title || !rockData.owner || !rockData.teamId}
                className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                style={{
                  background: !rockData.title || !rockData.owner || !rockData.teamId
                    ? '#9CA3AF'
                    : `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                  filter: !rockData.title || !rockData.owner || !rockData.teamId ? 'none' : undefined
                }}
                onMouseEnter={(e) => {
                  if (rockData.title && rockData.owner && rockData.teamId) {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (rockData.title && rockData.owner && rockData.teamId) {
                    e.currentTarget.style.filter = 'none';
                  }
                }}
              >
                Next: SMART Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Step 3: SMART Analysis */}
        {currentStep === 3 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.15)} 0%, ${hexToRgba(themeColors.secondary, 0.15)} 100%)`
                }}>
                  <Sparkles className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
                Step 4: SMART Analysis
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                AI analysis of your {labels.rock_singular} against SMART criteria
              </CardDescription>
            </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-3" style={{ color: themeColors.primary }} />
                <span className="text-slate-600 font-medium">Analyzing your {labels.rock_singular}...</span>
              </div>
            ) : smartAnalysis ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">SMART Score</h3>
                    <span className={`text-3xl font-bold ${getSmartScoreColor(smartAnalysis.overallScore)}`}>
                      {smartAnalysis.overallScore}%
                    </span>
                  </div>
                  <Progress value={smartAnalysis.overallScore} className="h-4" />
                </div>

                {/* Individual Scores */}
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(smartAnalysis.scores).map(([key, score]) => (
                    <div key={key} className="text-center bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className={`text-2xl font-bold ${getSmartScoreColor(score)}`}>
                        {score}%
                      </div>
                      <div className="text-sm text-slate-600 font-medium capitalize">
                        {key}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Improvements */}
                <Tabs defaultValue="improvements" className="w-full">
                  <TabsList ref={tabsRef} className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg">
                    <TabsTrigger value="improvements" className="rounded-xl transition-all duration-200 data-[state=active]:text-white data-[state=active]:shadow-lg">Improvements</TabsTrigger>
                    <TabsTrigger value="issues" className="rounded-xl transition-all duration-200 data-[state=active]:text-white data-[state=active]:shadow-lg">Key Issues</TabsTrigger>
                    <TabsTrigger value="suggestion" className="rounded-xl transition-all duration-200 data-[state=active]:text-white data-[state=active]:shadow-lg">Suggested Rewrite</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="improvements" className="space-y-3 mt-6">
                    {Object.entries(smartAnalysis.improvements).map(([criterion, improvement]) => (
                      <div key={criterion} className="border-l-4 pl-4 py-3 bg-white/60 backdrop-blur-sm rounded-r-xl shadow-sm hover:shadow-md transition-all duration-200" style={{
                        borderLeftColor: themeColors.primary
                      }}>
                        <div className="font-bold text-slate-900 capitalize mb-1">{criterion}</div>
                        <div className="text-sm text-slate-600">{improvement}</div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="issues" className="space-y-3 mt-6">
                    {smartAnalysis.keyIssues?.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3 bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded-xl p-4 shadow-sm">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-700 font-medium">{issue}</span>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="suggestion" className="space-y-4 mt-6">
                    <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-bold text-green-900 mb-3">Improved Title:</h4>
                      <p className="text-lg text-slate-800 font-medium">{smartAnalysis.suggestedRewrite?.title}</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-bold text-green-900 mb-3">Improved Description:</h4>
                      <p className="text-sm text-slate-700">{smartAnalysis.suggestedRewrite?.description}</p>
                    </div>
                    <Button onClick={applySuggestion} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Apply Suggested Improvements
                    </Button>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={analyzeRock} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-analyze
                    </Button>
                    <Button onClick={nextStep} className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                      Next: Milestones
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Button onClick={analyzeRock}>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze {labels.rock_singular}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Milestones */}
      {currentStep === 4 && (
        <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              Step 5: Milestone Generation
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              AI-generated milestones to track quarterly progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span>Generating milestones...</span>
              </div>
            ) : milestones.length > 0 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-100 to-emerald-200">
                              <Target className="h-4 w-4 text-green-600" />
                            </div>
                            <h4 className="font-bold text-slate-900">{milestone.title}</h4>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-slate-600 mb-2">
                              {milestone.description}
                            </p>
                          )}
                          {milestone.successCriteria && (
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-900">Success Criteria:</span> {milestone.successCriteria}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm px-3 py-1.5 backdrop-blur-sm rounded-lg border" style={{
                          backgroundColor: hexToRgba(themeColors.primary, 0.05),
                          borderColor: hexToRgba(themeColors.primary, 0.2)
                        }}>
                          <Calendar className="h-4 w-4" style={{ color: themeColors.primary }} />
                          <span className="font-medium" style={{ color: themeColors.primary }}>{format(new Date(milestone.dueDate), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={generateMilestones} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button onClick={nextStep} className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                      {rockData.type === 'individual' ? 'Next: Alignment Check' : 'Next: Review'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Button onClick={generateMilestones} className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                  <Target className="h-4 w-4 mr-2" />
                  Generate Milestones
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Alignment Check (for Department Rocks) */}
      {currentStep === 5 && rockData.type === 'individual' && (
        <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-200">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              Step 6: Company {labels.rock_singular} Alignment
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Ensure your Department {labels.rock_singular} supports Company priorities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span>Checking alignment...</span>
              </div>
            ) : alignment ? (
              <div className="space-y-6">
                {/* Alignment Score */}
                <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Alignment Score</h3>
                    <span className={`text-3xl font-bold ${getSmartScoreColor(alignment.alignmentScore)}`}>
                      {alignment.alignmentScore}%
                    </span>
                  </div>
                  <Progress value={alignment.alignmentScore} className="h-4" />
                  <p className="text-sm text-slate-600 mt-3">
                    {alignment.alignmentExplanation}
                  </p>
                </div>

                {/* Aligned Company Rocks */}
                {alignment.alignedRocks?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Supports These Company {labels.rocks}:</h4>
                    <div className="space-y-2">
                      {alignment.alignedRocks.map((rock, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-xl shadow-sm">
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <span className="font-semibold text-slate-800">{rock.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Adjustments */}
                {alignment.suggestedAdjustments?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3">Suggested Adjustments:</h4>
                    <div className="space-y-2">
                      {alignment.suggestedAdjustments.map((adjustment, index) => (
                        <div key={index} className="flex items-start gap-3 backdrop-blur-sm border rounded-xl p-4 shadow-sm" style={{
                          backgroundColor: hexToRgba(themeColors.primary, 0.05),
                          borderColor: hexToRgba(themeColors.primary, 0.2)
                        }}>
                          <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: themeColors.primary }} />
                          <span className="text-sm text-slate-700 font-medium">{adjustment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                {alignment.recommendation && (
                  <Alert className="bg-blue-50/80 backdrop-blur-sm border-blue-200/50 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="font-bold text-blue-900">Recommendation</AlertTitle>
                    <AlertDescription className="text-blue-800">{alignment.recommendation}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={checkAlignment} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-check
                    </Button>
                    <Button onClick={nextStep} className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                      Next: Review & Create
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Button onClick={checkAlignment}>
                  <Users className="h-4 w-4 mr-2" />
                  Check Alignment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: Review & Create */}
      {(currentStep === 6 || (currentStep === 5 && rockData.type === 'company')) && (
        <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-100 to-green-200">
                <Save className="h-5 w-5 text-emerald-600" />
              </div>
              Step 6: Review & Create {labels.rock_singular}
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Review your SMART {labels.rock_singular} before creating it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Final Rock Summary */}
            <div className="backdrop-blur-sm border rounded-2xl p-6 space-y-4 shadow-sm" style={{
              background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.05)} 0%, ${hexToRgba(themeColors.secondary, 0.05)} 100%)`,
              borderColor: hexToRgba(themeColors.primary, 0.2)
            }}>
              <div>
                <Label className="text-sm font-semibold" style={{ color: themeColors.primary }}>Title</Label>
                <p className="text-lg font-bold text-slate-900">{rockData.title}</p>
              </div>
              
              {rockData.description && (
                <div>
                  <Label className="text-sm font-semibold" style={{ color: themeColors.primary }}>Description</Label>
                  <p className="text-sm text-slate-700">{rockData.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                  <Label className="text-xs font-semibold" style={{ color: themeColors.primary }}>Owner</Label>
                  <p className="text-sm font-medium text-slate-800">
                    {users.find(u => u.id === rockData.owner)?.first_name} {users.find(u => u.id === rockData.owner)?.last_name}
                  </p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                  <Label className="text-xs font-semibold" style={{ color: themeColors.primary }}>Team</Label>
                  <p className="text-sm font-medium text-slate-800">
                    {teams.find(t => t.id === rockData.teamId)?.name}
                  </p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                  <Label className="text-xs font-semibold" style={{ color: themeColors.primary }}>Due Date</Label>
                  <p className="text-sm font-medium text-slate-800">{format(new Date(rockData.dueDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* SMART Score Summary */}
            {smartAnalysis && (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{
                    background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.15)} 0%, ${hexToRgba(themeColors.secondary, 0.15)} 100%)`
                  }}>
                    <Brain className="h-5 w-5" style={{ color: themeColors.primary }} />
                  </div>
                  <span className="font-bold text-slate-900">SMART Score</span>
                </div>
                <Badge className={`${getSmartScoreBadge(smartAnalysis.overallScore)} text-sm px-3 py-1`}>
                  {smartAnalysis.overallScore}%
                </Badge>
              </div>
            )}

            {/* Milestones Summary */}
            {milestones.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-3">Milestones ({milestones.length})</h4>
                <div className="space-y-2">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between p-3 backdrop-blur-sm rounded-lg" style={{
                      backgroundColor: hexToRgba(themeColors.primary, 0.05)
                    }}>
                      <span className="text-sm font-medium text-slate-800">{milestone.title}</span>
                      <span className="text-sm font-medium" style={{ color: themeColors.primary }}>
                        {format(new Date(milestone.dueDate), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alignment Summary */}
            {alignment && rockData.type === 'individual' && (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-200">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="font-bold text-slate-900">Company Alignment</span>
                </div>
                <Badge className={`${getSmartScoreBadge(alignment.alignmentScore)} text-sm px-3 py-1`}>
                  {alignment.alignmentScore}%
                </Badge>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep} className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
                Back
              </Button>
              <Button onClick={saveRock} size="lg" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                <Save className="h-4 w-4 mr-2" />
                Create SMART {labels.rock_singular}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default SmartRockAssistant;