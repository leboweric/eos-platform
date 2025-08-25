import { useState, useEffect } from 'react';
import { useTerminology } from '../../contexts/TerminologyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  FileText,
  Cloud,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Upload,
  Download
} from 'lucide-react';

const ProcessEditor = ({ process, onSave, onCancel, templates = [] }) => {
  const { getTerminology } = useTerminology();
  const [formData, setFormData] = useState({
    name: '',
    category: 'Operations',
    process_type: 'core_process',
    description: '',
    purpose: '',
    outcomes: '',
    storage_type: 'internal',
    methodology_type: 'eos',
    is_core_process: false,
    status: 'draft',
    review_frequency_days: 90,
    steps: [],
    external_url: '',
    external_file_id: '',
    ...process
  });

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Process categories based on methodology
  const getCategories = () => {
    const baseCategories = [
      'Sales & Marketing',
      'Operations',
      'Finance',
      'Human Resources',
      'Customer Success',
      'Technology'
    ];
    
    if (formData.methodology_type === 'eos') {
      return baseCategories;
    } else if (formData.methodology_type === 'scaling_up') {
      return [...baseCategories, 'Strategy', 'Execution'];
    } else {
      return [...baseCategories, 'Custom'];
    }
  };

  // Process types based on methodology
  const getProcessTypes = () => {
    const types = {
      eos: [
        { value: 'core_process', label: 'Core Process' },
        { value: 'checklist', label: 'Checklist' }
      ],
      scaling_up: [
        { value: 'process_map', label: 'Process Map' },
        { value: 'playbook', label: 'Playbook' },
        { value: 'checklist', label: 'Checklist' }
      ],
      '4dx': [
        { value: 'standard_work', label: 'Standard Work' },
        { value: 'wigs_process', label: 'WIG Process' }
      ],
      okr: [
        { value: 'playbook', label: 'Playbook' },
        { value: 'sop', label: 'Standard Operating Procedure' }
      ],
      custom: [
        { value: 'sop', label: 'SOP' },
        { value: 'checklist', label: 'Checklist' },
        { value: 'playbook', label: 'Playbook' }
      ]
    };
    
    return types[formData.methodology_type] || types.custom;
  };

  // Add a new step
  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          step_number: formData.steps.length + 1,
          title: '',
          description: '',
          bullets: [],
          responsible_role: '',
          estimated_time: '',
          tools_required: []
        }
      ]
    });
  };

  // Update a step
  const updateStep = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  // Remove a step
  const removeStep = (index) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setFormData({ ...formData, steps: newSteps });
  };

  // Move step up/down
  const moveStep = (index, direction) => {
    const newSteps = [...formData.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newSteps.length) {
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      // Renumber steps
      newSteps.forEach((step, i) => {
        step.step_number = i + 1;
      });
      setFormData({ ...formData, steps: newSteps });
    }
  };

  // Add bullet to step
  const addBullet = (stepIndex) => {
    const newSteps = [...formData.steps];
    if (!newSteps[stepIndex].bullets) {
      newSteps[stepIndex].bullets = [];
    }
    newSteps[stepIndex].bullets.push('');
    setFormData({ ...formData, steps: newSteps });
  };

  // Update bullet
  const updateBullet = (stepIndex, bulletIndex, value) => {
    const newSteps = [...formData.steps];
    newSteps[stepIndex].bullets[bulletIndex] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  // Remove bullet
  const removeBullet = (stepIndex, bulletIndex) => {
    const newSteps = [...formData.steps];
    newSteps[stepIndex].bullets = newSteps[stepIndex].bullets.filter((_, i) => i !== bulletIndex);
    setFormData({ ...formData, steps: newSteps });
  };

  // Load template
  const loadTemplate = (template) => {
    if (!template) return;
    
    setFormData({
      ...formData,
      name: template.name,
      category: template.category,
      description: template.description,
      methodology_type: template.methodology_type,
      steps: template.content?.steps?.map((step, index) => ({
        step_number: index + 1,
        title: step.title,
        bullets: step.bullets || [],
        description: '',
        responsible_role: '',
        estimated_time: '',
        tools_required: []
      })) || []
    });
    
    setSelectedTemplate(template);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Process name is required';
    }
    
    if (formData.storage_type === 'internal' && formData.steps.length === 0) {
      newErrors.steps = 'At least one step is required for internal processes';
    }
    
    if (formData.storage_type !== 'internal' && !formData.external_url) {
      newErrors.external_url = 'External document URL is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="steps" disabled={formData.storage_type !== 'internal'}>
            Steps {formData.steps.length > 0 && `(${formData.steps.length})`}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Information</CardTitle>
              <CardDescription>
                Define the basic information about this process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selection */}
              {templates.length > 0 && !process && (
                <div className="space-y-2">
                  <Label>Start from Template (Optional)</Label>
                  <Select onValueChange={(value) => loadTemplate(templates.find(t => t.id === value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.methodology_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Process Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Process Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Onboarding Process"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories().map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Process Type</Label>
                  <Select
                    value={formData.process_type}
                    onValueChange={(value) => setFormData({ ...formData, process_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getProcessTypes().map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this process accomplishes..."
                  rows={3}
                />
              </div>

              {/* Purpose & Outcomes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Why this process exists..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcomes">Expected Outcomes</Label>
                  <Textarea
                    id="outcomes"
                    value={formData.outcomes}
                    onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                    placeholder="What success looks like..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Core Process Flag (EOS only) */}
              {formData.methodology_type === 'eos' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="core-process"
                    checked={formData.is_core_process}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_core_process: checked })}
                  />
                  <Label htmlFor="core-process">
                    This is one of our 6-10 core processes
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          {formData.storage_type === 'internal' ? (
            <>
              {/* Steps List */}
              {formData.steps.map((step, stepIndex) => (
                <Card key={stepIndex}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Step {step.step_number}: {step.title || 'Untitled'}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStep(stepIndex, 'up')}
                          disabled={stepIndex === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStep(stepIndex, 'down')}
                          disabled={stepIndex === formData.steps.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStep(stepIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Step Title */}
                    <div className="space-y-2">
                      <Label>Step Title</Label>
                      <Input
                        value={step.title}
                        onChange={(e) => updateStep(stepIndex, 'title', e.target.value)}
                        placeholder="e.g., Qualify Lead"
                      />
                    </div>

                    {/* Step Description */}
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={step.description}
                        onChange={(e) => updateStep(stepIndex, 'description', e.target.value)}
                        placeholder="Detailed description of this step..."
                        rows={2}
                      />
                    </div>

                    {/* Bullets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Key Points / Bullets</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addBullet(stepIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Bullet
                        </Button>
                      </div>
                      {step.bullets?.map((bullet, bulletIndex) => (
                        <div key={bulletIndex} className="flex gap-2">
                          <Input
                            value={bullet}
                            onChange={(e) => updateBullet(stepIndex, bulletIndex, e.target.value)}
                            placeholder="Enter bullet point..."
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBullet(stepIndex, bulletIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Responsible Role</Label>
                        <Input
                          value={step.responsible_role}
                          onChange={(e) => updateStep(stepIndex, 'responsible_role', e.target.value)}
                          placeholder="e.g., Sales Manager"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Time</Label>
                        <Input
                          value={step.estimated_time}
                          onChange={(e) => updateStep(stepIndex, 'estimated_time', e.target.value)}
                          placeholder="e.g., 30 minutes"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Step Button */}
              <Button onClick={addStep} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>

              {errors.steps && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.steps}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert>
              <Cloud className="h-4 w-4" />
              <AlertDescription>
                This process uses external storage. Steps are managed in the external document.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage & Methodology</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Storage Type */}
              <div className="space-y-2">
                <Label>Storage Type</Label>
                <Select
                  value={formData.storage_type}
                  onValueChange={(value) => setFormData({ ...formData, storage_type: value })}
                  disabled={process} // Can't change storage type after creation
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (AXP Database)</SelectItem>
                    <SelectItem value="google_drive">Google Drive</SelectItem>
                    <SelectItem value="onedrive">Microsoft OneDrive</SelectItem>
                    <SelectItem value="sharepoint">Microsoft SharePoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* External Storage Fields */}
              {formData.storage_type !== 'internal' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="external_url">Document URL *</Label>
                    <Input
                      id="external_url"
                      value={formData.external_url}
                      onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                      placeholder="https://docs.google.com/document/..."
                      className={errors.external_url ? 'border-red-500' : ''}
                    />
                    {errors.external_url && (
                      <p className="text-sm text-red-500">{errors.external_url}</p>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Make sure the document is shared with the appropriate permissions for your team.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {/* Methodology */}
              <div className="space-y-2">
                <Label>Methodology</Label>
                <Select
                  value={formData.methodology_type}
                  onValueChange={(value) => setFormData({ ...formData, methodology_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eos">EOS</SelectItem>
                    <SelectItem value="scaling_up">Scaling Up</SelectItem>
                    <SelectItem value="4dx">4DX</SelectItem>
                    <SelectItem value="okr">OKRs</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Review Frequency */}
              <div className="space-y-2">
                <Label htmlFor="review_frequency">Review Frequency (days)</Label>
                <Input
                  id="review_frequency"
                  type="number"
                  value={formData.review_frequency_days}
                  onChange={(e) => setFormData({ ...formData, review_frequency_days: parseInt(e.target.value) })}
                  min={30}
                  max={365}
                />
                <p className="text-sm text-muted-foreground">
                  Process will be flagged for review every {formData.review_frequency_days} days
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
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
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {process ? 'Update Process' : 'Create Process'}
        </Button>
      </div>
    </div>
  );
};

export default ProcessEditor;