import { useState, useEffect } from 'react';
import { useTerminology } from '../contexts/TerminologyContext';
import { terminologyService } from '../services/terminologyService';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Target,
  BarChart,
  Calendar,
  Users,
  Building2,
  FileText,
  Zap
} from 'lucide-react';

const TerminologySettingsPage = () => {
  const { terminology, updateTerminology, applyPreset, resetToDefaults, labels } = useTerminology();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({});
  const [presets, setPresets] = useState({});
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [currentFramework, setCurrentFramework] = useState('custom');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize form with current terminology
    setFormData(terminology);
    fetchPresets();
    detectCurrentFramework();
  }, [terminology]);

  const fetchPresets = async () => {
    try {
      const data = await terminologyService.getPresets();
      setPresets(data);
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    }
  };

  const detectCurrentFramework = () => {
    // Detect which framework is currently active based on terminology
    if (terminology?.priorities_label === 'Rocks' && terminology?.business_blueprint_label === 'V/TO') {
      setCurrentFramework('eos');
      setSelectedPreset('eos');
    } else if (terminology?.priorities_label === 'Objectives' && terminology?.business_blueprint_label === 'Strategy Document') {
      setCurrentFramework('okrs');
      setSelectedPreset('okrs');
    } else if (terminology?.business_blueprint_label === 'One-Page Strategic Plan') {
      setCurrentFramework('scaling_up');
      setSelectedPreset('scaling_up');
    } else if (terminology?.priorities_label?.includes('WIG')) {
      setCurrentFramework('fourDx');
      setSelectedPreset('fourDx');
    } else {
      setCurrentFramework('custom');
      setSelectedPreset('custom');
    }
  };

  const getFrameworkDisplayName = () => {
    const frameworkNames = {
      eos: 'EOS (Entrepreneurial Operating System)',
      okrs: 'OKRs (Objectives & Key Results)',
      scaling_up: 'Scaling Up (Rockefeller Habits)',
      fourDx: '4 Disciplines of Execution',
      custom: 'Custom Terminology'
    };
    return frameworkNames[currentFramework] || 'Custom Terminology';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateTerminology(formData);
      setSuccess('Terminology updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update terminology. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePresetChange = async (preset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom' && presets[preset]) {
      setFormData(presets[preset]);
    }
  };

  const handleApplyPreset = async () => {
    if (selectedPreset === 'custom') return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await applyPreset(selectedPreset);
      setCurrentFramework(selectedPreset);
      setSuccess(`${presets[selectedPreset]?.name || selectedPreset} preset applied successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to apply preset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await resetToDefaults();
      setSuccess('Terminology reset to defaults!');
      setSelectedPreset('custom');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to reset terminology. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check if user has organization ID
  if (!user?.organization_id) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Unable to load terminology settings. Organization information is missing. Please try logging out and back in.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Terminology Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Customize the terminology used throughout AXP to match your organization's framework
        </p>
        
        {/* Current Framework Display */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Currently Active Framework:</span>
            <span className="text-blue-800">{getFrameworkDisplayName()}</span>
          </div>
        </div>
      </div>

      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Preset Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Presets
          </CardTitle>
          <CardDescription>
            Choose a pre-configured terminology set for popular frameworks. 
            {currentFramework !== 'custom' && (
              <span className="block mt-1 text-blue-600 font-medium">
                Currently using: {getFrameworkDisplayName()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="preset">Select Framework</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger id="preset">
                  <SelectValue placeholder="Choose a framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="eos">EOS (Entrepreneurial Operating System)</SelectItem>
                  <SelectItem value="okrs">OKRs (Objectives & Key Results)</SelectItem>
                  <SelectItem value="scaling_up">Scaling Up (Rockefeller Habits)</SelectItem>
                  <SelectItem value="fourDx">4 Disciplines of Execution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleApplyPreset} 
              disabled={selectedPreset === 'custom' || saving}
              variant="secondary"
            >
              Apply Preset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Example Preview */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FileText className="h-5 w-5" />
            Terminology Preview
          </CardTitle>
          <CardDescription className="text-blue-700">
            Here's how your selected terminology appears throughout the platform:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Priorities:</p>
              <p className="font-semibold text-blue-900">{formData.priorities_label || terminology?.priorities_label || 'Quarterly Priorities'}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Strategic Plan:</p>
              <p className="font-semibold text-blue-900">{formData.business_blueprint_label || terminology?.business_blueprint_label || '2-Page Plan'}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Weekly Meeting:</p>
              <p className="font-semibold text-blue-900">{formData.weekly_meeting_label || terminology?.weekly_meeting_label || 'Weekly Team Meeting'}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Org Chart:</p>
              <p className="font-semibold text-blue-900">{formData.accountability_chart_label || terminology?.accountability_chart_label || 'Organizational Chart'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Terminology */}
      <Tabs defaultValue="core" className="space-y-4">
        <TabsList>
          <TabsTrigger value="core">Core Terms</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>

        <TabsContent value="core">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Core Terminology
              </CardTitle>
              <CardDescription>
                Customize the main terms used throughout the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priorities_label">Priorities (Plural)</Label>
                  <Input
                    id="priorities_label"
                    value={formData.priorities_label || ''}
                    onChange={(e) => handleInputChange('priorities_label', e.target.value)}
                    placeholder="e.g., Quarterly Priorities, Rocks, OKRs"
                  />
                </div>
                <div>
                  <Label htmlFor="priority_singular">Priority (Singular)</Label>
                  <Input
                    id="priority_singular"
                    value={formData.priority_singular || ''}
                    onChange={(e) => handleInputChange('priority_singular', e.target.value)}
                    placeholder="e.g., Priority, Rock, Objective"
                  />
                </div>
                <div>
                  <Label htmlFor="issues_label">Issues (Plural)</Label>
                  <Input
                    id="issues_label"
                    value={formData.issues_label || ''}
                    onChange={(e) => handleInputChange('issues_label', e.target.value)}
                    placeholder="e.g., Issues, Blockers, Obstacles"
                  />
                </div>
                <div>
                  <Label htmlFor="issue_singular">Issue (Singular)</Label>
                  <Input
                    id="issue_singular"
                    value={formData.issue_singular || ''}
                    onChange={(e) => handleInputChange('issue_singular', e.target.value)}
                    placeholder="e.g., Issue, Blocker, Obstacle"
                  />
                </div>
                <div>
                  <Label htmlFor="todos_label">To-Dos (Plural)</Label>
                  <Input
                    id="todos_label"
                    value={formData.todos_label || ''}
                    onChange={(e) => handleInputChange('todos_label', e.target.value)}
                    placeholder="e.g., To-Dos, Action Items, Tasks"
                  />
                </div>
                <div>
                  <Label htmlFor="todo_singular">To-Do (Singular)</Label>
                  <Input
                    id="todo_singular"
                    value={formData.todo_singular || ''}
                    onChange={(e) => handleInputChange('todo_singular', e.target.value)}
                    placeholder="e.g., To-Do, Action Item, Task"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="scorecard_label">Scorecard/Metrics Label</Label>
                <Input
                  id="scorecard_label"
                  value={formData.scorecard_label || ''}
                  onChange={(e) => handleInputChange('scorecard_label', e.target.value)}
                  placeholder="e.g., Scorecard, KPI Dashboard, Metrics"
                />
              </div>
              <div>
                <Label htmlFor="problem_solving_process">Problem Solving Process</Label>
                <Input
                  id="problem_solving_process"
                  value={formData.problem_solving_process || ''}
                  onChange={(e) => handleInputChange('problem_solving_process', e.target.value)}
                  placeholder="e.g., Issues & Problem Solving, IDS, Blocker Resolution"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meeting Terminology
              </CardTitle>
              <CardDescription>
                Customize meeting names to match your framework
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="weekly_meeting_label">Weekly Meeting Name</Label>
                <Input
                  id="weekly_meeting_label"
                  value={formData.weekly_meeting_label || ''}
                  onChange={(e) => handleInputChange('weekly_meeting_label', e.target.value)}
                  placeholder="e.g., Weekly Accountability Meeting, Level 10, Weekly Sync"
                />
              </div>
              <div>
                <Label htmlFor="quarterly_meeting_label">Quarterly Meeting Name</Label>
                <Input
                  id="quarterly_meeting_label"
                  value={formData.quarterly_meeting_label || ''}
                  onChange={(e) => handleInputChange('quarterly_meeting_label', e.target.value)}
                  placeholder="e.g., Quarterly Planning, OKR Planning Session"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Planning Terminology
              </CardTitle>
              <CardDescription>
                Customize strategic planning terminology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_blueprint_label">Strategic Plan Document</Label>
                <Input
                  id="business_blueprint_label"
                  value={formData.business_blueprint_label || ''}
                  onChange={(e) => handleInputChange('business_blueprint_label', e.target.value)}
                  placeholder="e.g., Business Blueprint, V/TO, Strategic Plan"
                />
              </div>
              <div>
                <Label htmlFor="long_term_vision_label">Long-term Vision</Label>
                <Input
                  id="long_term_vision_label"
                  value={formData.long_term_vision_label || ''}
                  onChange={(e) => handleInputChange('long_term_vision_label', e.target.value)}
                  placeholder="e.g., 3-Year Picture, Strategic Vision, BHAG"
                />
              </div>
              <div>
                <Label htmlFor="annual_goals_label">Annual Goals</Label>
                <Input
                  id="annual_goals_label"
                  value={formData.annual_goals_label || ''}
                  onChange={(e) => handleInputChange('annual_goals_label', e.target.value)}
                  placeholder="e.g., Annual Goals, 1-Year Plan, Annual OKRs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quarter_label">Quarter</Label>
                  <Input
                    id="quarter_label"
                    value={formData.quarter_label || ''}
                    onChange={(e) => handleInputChange('quarter_label', e.target.value)}
                    placeholder="e.g., Quarter, Period, Cycle"
                  />
                </div>
                <div>
                  <Label htmlFor="year_label">Year</Label>
                  <Input
                    id="year_label"
                    value={formData.year_label || ''}
                    onChange={(e) => handleInputChange('year_label', e.target.value)}
                    placeholder="e.g., Year, Annual Period"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Structure
              </CardTitle>
              <CardDescription>
                Customize organizational terminology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="organization_label">Organization</Label>
                <Input
                  id="organization_label"
                  value={formData.organization_label || ''}
                  onChange={(e) => handleInputChange('organization_label', e.target.value)}
                  placeholder="e.g., Organization, Company, Business"
                />
              </div>
              <div>
                <Label htmlFor="team_label">Team</Label>
                <Input
                  id="team_label"
                  value={formData.team_label || ''}
                  onChange={(e) => handleInputChange('team_label', e.target.value)}
                  placeholder="e.g., Team, Squad, Group"
                />
              </div>
              <div>
                <Label htmlFor="department_label">Department</Label>
                <Input
                  id="department_label"
                  value={formData.department_label || ''}
                  onChange={(e) => handleInputChange('department_label', e.target.value)}
                  placeholder="e.g., Department, Division, Unit"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={saving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TerminologySettingsPage;