import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTerminology } from '../../contexts/TerminologyContext';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme } from '../../utils/themeUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  ListChecks,
  Target,
  X,
  GripVertical,
  Edit,
  Check
} from 'lucide-react';
import axios from '../../services/axiosConfig';

const ProcessWorkflowEditor = ({ process, onSave, onCancel, templates = [], teamMembers = [] }) => {
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  const [currentStep, setCurrentStep] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Form data with all process information
  const [formData, setFormData] = useState({
    name: process?.name || '',
    description: process?.description || '',
    category: process?.category || 'Operations',
    owner_user_id: process?.owner_user_id || user?.id || '',
    purpose: process?.purpose || '',
    outcomes: process?.outcomes || '',
    storage_type: process?.storage_type || 'internal',
    methodology_type: process?.methodology_type || 'eos',
    is_core_process: process?.is_core_process || false,
    status: process?.status || 'draft',
    review_frequency_days: process?.review_frequency_days || 90,
    steps: process?.steps || [],
    external_url: process?.external_url || '',
    external_file_id: process?.external_file_id || '',
  });

  // Track which step is being edited
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [editingSubStepIndex, setEditingSubStepIndex] = useState(null);

  useEffect(() => {
    fetchOrganizationTheme();
  }, []);

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  // Process categories based on methodology
  const getCategories = () => {
    const baseCategories = [
      'Sales & Marketing',
      'Operations',
      'Finance',
      'Human Resources',
      'Customer Success',
      'Technology',
      'Product',
      'Legal & Compliance'
    ];
    
    if (formData.methodology_type === 'scaling_up') {
      return [...baseCategories, 'Strategy', 'Execution'];
    }
    return baseCategories;
  };

  // Workflow steps configuration
  const workflowSteps = [
    { id: 'overview', label: 'Process Overview', icon: FileText },
    { id: 'steps', label: 'Process Steps', icon: ListChecks },
    { id: 'review', label: 'Review & Settings', icon: CheckCircle }
  ];

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      const newErrors = {};
      if (!formData.name) newErrors.name = 'Process name is required';
      if (!formData.description) newErrors.description = 'Description is required';
      if (!formData.owner_user_id) newErrors.owner = 'Process owner is required';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    setErrors({});
    if (currentStep < workflowSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddStep = () => {
    const newStep = {
      step_number: formData.steps.length + 1,
      title: '',
      description: '',
      bullets: [],
      responsible_role: '',
      estimated_time: '',
      tools_required: []
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
    setEditingStepIndex(formData.steps.length);
  };

  const handleUpdateStep = (index, field, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleDeleteStep = (index) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index);
    // Renumber remaining steps
    updatedSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setFormData({ ...formData, steps: updatedSteps });
    setEditingStepIndex(null);
  };

  const handleMoveStep = (index, direction) => {
    const updatedSteps = [...formData.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < updatedSteps.length) {
      [updatedSteps[index], updatedSteps[targetIndex]] = [updatedSteps[targetIndex], updatedSteps[index]];
      // Renumber steps
      updatedSteps.forEach((step, i) => {
        step.step_number = i + 1;
      });
      setFormData({ ...formData, steps: updatedSteps });
    }
  };

  const handleAddSubStep = (stepIndex) => {
    const updatedSteps = [...formData.steps];
    if (!updatedSteps[stepIndex].bullets) {
      updatedSteps[stepIndex].bullets = [];
    }
    updatedSteps[stepIndex].bullets.push({ text: '', completed: false });
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleUpdateSubStep = (stepIndex, subStepIndex, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[stepIndex].bullets[subStepIndex] = { 
      ...updatedSteps[stepIndex].bullets[subStepIndex], 
      text: value 
    };
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleDeleteSubStep = (stepIndex, subStepIndex) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[stepIndex].bullets = updatedSteps[stepIndex].bullets.filter((_, i) => i !== subStepIndex);
    setFormData({ ...formData, steps: updatedSteps });
  };

  const handleSaveProcess = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save process:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    onCancel();
  };

  // Calculate progress
  const progressPercentage = ((currentStep + 1) / workflowSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Sparkles className="h-4 w-4" />
                {process ? 'EDIT PROCESS' : 'CREATE NEW PROCESS'}
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {workflowSteps[currentStep].label}
              </h1>
            </div>
            <Button
              variant="ghost"
              onClick={handleExit}
              className="text-slate-600 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive 
                            ? 'shadow-lg' 
                            : isCompleted 
                            ? '' 
                            : 'bg-gray-100'
                        }`}
                        style={{
                          background: isActive || isCompleted
                            ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                            : undefined
                        }}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        )}
                      </div>
                      <span className={`ml-3 font-medium ${
                        isActive ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className="flex-1 mx-4">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: isCompleted ? '100%' : '0%',
                              background: `linear-gradient(90deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-sm">
          {/* Step 1: Process Overview */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Process Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter a clear, descriptive name for this process"
                  className={`${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide a brief overview of what this process accomplishes"
                  rows={3}
                  className={`${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2">
                    Process Owner <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.owner_user_id}
                    onValueChange={(value) => setFormData({ ...formData, owner_user_id: value })}
                  >
                    <SelectTrigger className={`${errors.owner ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.owner && (
                    <p className="text-sm text-red-500 mt-1">{errors.owner}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories().map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Purpose & Why This Process Exists
                </Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Explain why this process is important and what problem it solves"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2">
                  Expected Outcomes
                </Label>
                <Textarea
                  value={formData.outcomes}
                  onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                  placeholder="What results should be achieved when this process is followed?"
                  rows={2}
                />
              </div>

              {formData.methodology_type === 'eos' && (
                <div className="flex items-center space-x-3 p-4 rounded-lg"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary}5 0%, ${themeColors.secondary}5 100%)`
                     }}>
                  <Switch
                    checked={formData.is_core_process}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_core_process: checked })}
                  />
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Mark as Core Process
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Is this one of your 6-10 core processes that define how your business operates?
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Process Steps */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {formData.steps.length === 0 ? (
                <div className="text-center py-12 px-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                  <ListChecks className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No steps added yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Start building your process by adding the first step
                  </p>
                  <Button
                    onClick={handleAddStep}
                    className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ 
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {formData.steps.map((step, index) => (
                      <div key={index} 
                           className="p-6 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(index, 'up')}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(index, 'down')}
                                disabled={index === formData.steps.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                 style={{
                                   background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                                 }}>
                              {step.step_number}
                            </div>
                            {editingStepIndex === index ? (
                              <Input
                                value={step.title}
                                onChange={(e) => handleUpdateStep(index, 'title', e.target.value)}
                                placeholder="Enter step title"
                                className="flex-1 font-medium"
                                autoFocus
                              />
                            ) : (
                              <h3 className="font-medium text-lg text-slate-900">
                                {step.title || 'Untitled Step'}
                              </h3>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingStepIndex(editingStepIndex === index ? null : index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStep(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {editingStepIndex === index && (
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-2">
                                Step Description
                              </Label>
                              <Textarea
                                value={step.description}
                                onChange={(e) => handleUpdateStep(index, 'description', e.target.value)}
                                placeholder="Describe what happens in this step"
                                rows={3}
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-2">
                                Sub-steps / Checklist
                              </Label>
                              <div className="space-y-2">
                                {step.bullets?.map((bullet, subIndex) => (
                                  <div key={subIndex} className="flex items-center gap-2">
                                    <span className="text-slate-400">•</span>
                                    <Input
                                      value={bullet.text}
                                      onChange={(e) => handleUpdateSubStep(index, subIndex, e.target.value)}
                                      placeholder="Enter sub-step"
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSubStep(index, subIndex)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddSubStep(index)}
                                  className="mt-2"
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Add Sub-step
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-slate-700 mb-2">
                                  Responsible Role
                                </Label>
                                <Input
                                  value={step.responsible_role}
                                  onChange={(e) => handleUpdateStep(index, 'responsible_role', e.target.value)}
                                  placeholder="Who performs this step?"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700 mb-2">
                                  Estimated Time
                                </Label>
                                <Input
                                  value={step.estimated_time}
                                  onChange={(e) => handleUpdateStep(index, 'estimated_time', e.target.value)}
                                  placeholder="e.g., 15 minutes"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleAddStep}
                    variant="outline"
                    className="w-full border-2 border-dashed hover:border-solid transition-all"
                    style={{ borderColor: themeColors.primary }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Step
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 3: Review & Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: themeColors.primary }} />
                  Process Summary
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-600">Name:</span>
                    <p className="font-medium">{formData.name || 'Unnamed Process'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Description:</span>
                    <p className="text-sm">{formData.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Owner:</span>
                    <p className="font-medium">
                      {teamMembers.find(m => m.id === formData.owner_user_id)?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Total Steps:</span>
                    <p className="font-medium">{formData.steps.length}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <ListChecks className="h-5 w-5" style={{ color: themeColors.primary }} />
                  Process Steps Overview
                </h3>
                {formData.steps.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No steps have been added to this process. Go back to add steps.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                             style={{
                               background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                             }}>
                          {step.step_number}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.title || 'Untitled Step'}</p>
                          {step.bullets?.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {step.bullets.length} sub-step{step.bullets.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: themeColors.primary }} />
                  Review Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2">
                      Review Frequency
                    </Label>
                    <Select
                      value={formData.review_frequency_days.toString()}
                      onValueChange={(value) => setFormData({ ...formData, review_frequency_days: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Every 30 days</SelectItem>
                        <SelectItem value="60">Every 60 days</SelectItem>
                        <SelectItem value="90">Every 90 days (Recommended)</SelectItem>
                        <SelectItem value="180">Every 6 months</SelectItem>
                        <SelectItem value="365">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2">
                      Process Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExit}
            >
              Save & Exit
            </Button>
            
            {currentStep === workflowSteps.length - 1 ? (
              <Button
                onClick={handleSaveProcess}
                disabled={saving || formData.steps.length === 0}
                className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Publish Process
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                }}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your progress?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save your progress before exiting?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={confirmExit}>
              Exit without saving
            </Button>
            <Button 
              onClick={async () => {
                await handleSaveProcess();
                confirmExit();
              }}
              style={{ 
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
              }}
              className="text-white"
            >
              Save & Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessWorkflowEditor;