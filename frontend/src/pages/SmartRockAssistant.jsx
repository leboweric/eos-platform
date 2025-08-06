import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { aiRockAssistantService } from '../services/aiRockAssistantService';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { teamsService } from '../services/teamsService';
import { userService } from '../services/userService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const SmartRockAssistant = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Configuration check
  const [isConfigured, setIsConfigured] = useState(null);
  const [configError, setConfigError] = useState(null);
  
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
      
      // Navigate to priorities page
      navigate(`/organizations/${orgId}/quarterly-priorities`);
    } catch (error) {
      console.error('Error saving Rock:', error);
    }
  };

  const nextStep = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    setCurrentStep(currentStep + 1);
    
    // Trigger analysis when moving to step 2
    if (currentStep === 1 && rockData.title) {
      analyzeRock();
    }
    // Generate milestones when moving to step 3
    if (currentStep === 2) {
      generateMilestones();
    }
    // Check alignment when moving to step 4
    if (currentStep === 3 && rockData.type === 'individual') {
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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">SMART Rock Assistant</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/organizations/${orgId}/quarterly-priorities`)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
        <p className="text-muted-foreground">
          Create Rocks that are Specific, Measurable, Achievable, Relevant, and Time-bound
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Step {currentStep} of 5</span>
          {smartAnalysis && (
            <Badge className={getSmartScoreBadge(smartAnalysis.overallScore)}>
              SMART Score: {smartAnalysis.overallScore}%
            </Badge>
          )}
        </div>
        <Progress value={(currentStep / 5) * 100} className="h-2" />
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Basic Rock Information</CardTitle>
            <CardDescription>
              Start with your initial Rock idea. The AI will help refine it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Rock Title*</Label>
              <Input
                id="title"
                value={rockData.title}
                onChange={(e) => setRockData({ ...rockData, title: e.target.value })}
                placeholder="e.g., Launch new customer portal"
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                What do you want to accomplish this quarter?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={rockData.description}
                onChange={(e) => setRockData({ ...rockData, description: e.target.value })}
                placeholder="Provide additional context or success criteria..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Rock Type</Label>
                <Select
                  value={rockData.type}
                  onValueChange={(value) => setRockData({ ...rockData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company Rock</SelectItem>
                    <SelectItem value="individual">Department/Individual Rock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select
                  value={rockData.teamId}
                  onValueChange={(value) => setRockData({ ...rockData, teamId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="owner">Owner</Label>
                <Select
                  value={rockData.owner}
                  onValueChange={(value) => setRockData({ ...rockData, owner: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quarter">Quarter</Label>
                <Select
                  value={rockData.quarter}
                  onValueChange={(value) => setRockData({ ...rockData, quarter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={rockData.year}
                  onChange={(e) => setRockData({ ...rockData, year: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={nextStep}
                disabled={!rockData.title || !rockData.owner || !rockData.teamId}
              >
                Next: SMART Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: SMART Analysis */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: SMART Analysis</CardTitle>
            <CardDescription>
              AI analysis of your Rock against SMART criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span>Analyzing your Rock...</span>
              </div>
            ) : smartAnalysis ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">SMART Score</h3>
                    <span className={`text-3xl font-bold ${getSmartScoreColor(smartAnalysis.overallScore)}`}>
                      {smartAnalysis.overallScore}%
                    </span>
                  </div>
                  <Progress value={smartAnalysis.overallScore} className="h-3" />
                </div>

                {/* Individual Scores */}
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(smartAnalysis.scores).map(([key, score]) => (
                    <div key={key} className="text-center">
                      <div className={`text-2xl font-bold ${getSmartScoreColor(score)}`}>
                        {score}%
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {key}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Improvements */}
                <Tabs defaultValue="improvements" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="improvements">Improvements</TabsTrigger>
                    <TabsTrigger value="issues">Key Issues</TabsTrigger>
                    <TabsTrigger value="suggestion">Suggested Rewrite</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="improvements" className="space-y-3">
                    {Object.entries(smartAnalysis.improvements).map(([criterion, improvement]) => (
                      <div key={criterion} className="border-l-4 border-primary pl-4 py-2">
                        <div className="font-semibold capitalize mb-1">{criterion}</div>
                        <div className="text-sm text-muted-foreground">{improvement}</div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="issues" className="space-y-3">
                    {smartAnalysis.keyIssues?.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <span className="text-sm">{issue}</span>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="suggestion" className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Improved Title:</h4>
                      <p className="text-lg">{smartAnalysis.suggestedRewrite?.title}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Improved Description:</h4>
                      <p className="text-sm">{smartAnalysis.suggestedRewrite?.description}</p>
                    </div>
                    <Button onClick={applySuggestion} className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Apply Suggested Improvements
                    </Button>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={analyzeRock}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-analyze
                    </Button>
                    <Button onClick={nextStep}>
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
                  Analyze Rock
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Milestones */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Milestone Generation</CardTitle>
            <CardDescription>
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
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">{milestone.title}</h4>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {milestone.description}
                            </p>
                          )}
                          {milestone.successCriteria && (
                            <p className="text-sm">
                              <span className="font-medium">Success Criteria:</span> {milestone.successCriteria}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={generateMilestones}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button onClick={nextStep}>
                      {rockData.type === 'individual' ? 'Next: Alignment Check' : 'Next: Review'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Button onClick={generateMilestones}>
                  <Target className="h-4 w-4 mr-2" />
                  Generate Milestones
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Alignment Check (for Department Rocks) */}
      {currentStep === 4 && rockData.type === 'individual' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Company Rock Alignment</CardTitle>
            <CardDescription>
              Ensure your Department Rock supports Company priorities
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
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Alignment Score</h3>
                    <span className={`text-3xl font-bold ${getSmartScoreColor(alignment.alignmentScore)}`}>
                      {alignment.alignmentScore}%
                    </span>
                  </div>
                  <Progress value={alignment.alignmentScore} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {alignment.alignmentExplanation}
                  </p>
                </div>

                {/* Aligned Company Rocks */}
                {alignment.alignedRocks?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Supports These Company Rocks:</h4>
                    <div className="space-y-2">
                      {alignment.alignedRocks.map((rock, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-medium">{rock.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Adjustments */}
                {alignment.suggestedAdjustments?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Suggested Adjustments:</h4>
                    <div className="space-y-2">
                      {alignment.suggestedAdjustments.map((adjustment, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                          <span className="text-sm">{adjustment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                {alignment.recommendation && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Recommendation</AlertTitle>
                    <AlertDescription>{alignment.recommendation}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={checkAlignment}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-check
                    </Button>
                    <Button onClick={nextStep}>
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

      {/* Step 5: Review & Create */}
      {(currentStep === 5 || (currentStep === 4 && rockData.type === 'company')) && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Review & Create Rock</CardTitle>
            <CardDescription>
              Review your SMART Rock before creating it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Final Rock Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Title</Label>
                <p className="text-lg font-semibold">{rockData.title}</p>
              </div>
              
              {rockData.description && (
                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="text-sm">{rockData.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Owner</Label>
                  <p className="text-sm">
                    {users.find(u => u.id === rockData.owner)?.first_name} {users.find(u => u.id === rockData.owner)?.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Team</Label>
                  <p className="text-sm">
                    {teams.find(t => t.id === rockData.teamId)?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Due Date</Label>
                  <p className="text-sm">{format(new Date(rockData.dueDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* SMART Score Summary */}
            {smartAnalysis && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  <span className="font-semibold">SMART Score</span>
                </div>
                <Badge className={getSmartScoreBadge(smartAnalysis.overallScore)}>
                  {smartAnalysis.overallScore}%
                </Badge>
              </div>
            )}

            {/* Milestones Summary */}
            {milestones.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Milestones ({milestones.length})</h4>
                <div className="space-y-2">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{milestone.title}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(milestone.dueDate), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alignment Summary */}
            {alignment && rockData.type === 'individual' && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-primary" />
                  <span className="font-semibold">Company Alignment</span>
                </div>
                <Badge className={getSmartScoreBadge(alignment.alignmentScore)}>
                  {alignment.alignmentScore}%
                </Badge>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={saveRock} size="lg">
                <Save className="h-4 w-4 mr-2" />
                Create SMART Rock
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartRockAssistant;