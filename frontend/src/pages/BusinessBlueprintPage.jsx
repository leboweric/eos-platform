import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link, Navigate } from 'react-router-dom';
import { businessBlueprintService } from '../services/businessBlueprintService';
import { organizationService } from '../services/organizationService';
import { getRevenueLabel, getRevenueLabelWithSuffix } from '../utils/revenueUtils';
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
  CheckCircle2
} from 'lucide-react';

const BusinessBlueprintPage = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('vision');
  const [organization, setOrganization] = useState(null);

  // Check if user is on leadership team
  if (!isOnLeadershipTeam()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // 2-Page Plan data
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
  
  // State for editing Core Focus
  const [editingCoreFocus, setEditingCoreFocus] = useState(false);
  const [editingBHAG, setEditingBHAG] = useState(false);
  const [editingMarketingStrategy, setEditingMarketingStrategy] = useState(false);

  useEffect(() => {
    fetchBusinessBlueprint();
    fetchOrganization();
  }, []);

  const fetchBusinessBlueprint = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessBlueprintService.getBusinessBlueprint();
      
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
          revenue: data.threeYearPicture.revenue_target || '',
          profit: data.threeYearPicture.profit_target || '',
          lookLikeItems: data.threeYearPicture.what_does_it_look_like ? 
            JSON.parse(data.threeYearPicture.what_does_it_look_like) : []
        } : null,
        oneYearPlan: data.oneYearPlan ? {
          ...data.oneYearPlan,
          revenue: data.oneYearPlan.revenue_target || '',
          profit: data.oneYearPlan.profit_percentage || '',
          goals: data.oneYearPlan.goals && Array.isArray(data.oneYearPlan.goals) ? 
            data.oneYearPlan.goals.map(g => g.goal_text) : ['', '', '']
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
      setSuccess('Hedgehog updated successfully');
    } catch (error) {
      setError('Failed to update Hedgehog');
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
      setSuccess('BHAG updated successfully');
    } catch (error) {
      setError('Failed to update BHAG');
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
      const { targetMarket, differentiators, provenProcessExists, guaranteeExists, guaranteeDescription } = blueprintData.marketingStrategy;
      const strategyData = {
        targetMarket,
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
      // Update with the saved data from the backend to ensure we have the latest values
      setBlueprintData(prev => ({
        ...prev,
        threeYearPicture: savedData || data
      }));
      setSuccess('3-Year Picture updated successfully');
      // Refresh the business blueprint data to ensure everything is in sync
      setTimeout(() => {
        fetchBusinessBlueprint();
      }, 500);
    } catch (error) {
      setError('Failed to update 3-Year Picture');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // One Year Plan handler
  const handleSaveOneYearPlan = async (data) => {
    try {
      setSaving(true);
      setError(null);
      const savedData = await businessBlueprintService.updateOneYearPlan(data);
      // Update with the saved data from the backend to ensure we have the latest values
      setBlueprintData(prev => ({
        ...prev,
        oneYearPlan: savedData || data
      }));
      setSuccess('1-Year Plan updated successfully');
      // Refresh the business blueprint data to ensure everything is in sync
      setTimeout(() => {
        fetchBusinessBlueprint();
      }, 500);
    } catch (error) {
      setError('Failed to update 1-Year Plan');
      throw error;
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              2-Page Plan
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Define your organization's vision and strategy for success</p>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white shadow-sm">
            <TabsTrigger value="vision" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-lg font-medium">
              <Target className="mr-2 h-5 w-5" />
              Vision
            </TabsTrigger>
            <TabsTrigger value="execution" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-lg font-medium">
              <TrendingUp className="mr-2 h-5 w-5" />
              Execution
            </TabsTrigger>
          </TabsList>

        <TabsContent value="vision" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Core Values, Hedgehog, BHAG, Marketing Strategy */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Values */}
            <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center text-xl text-gray-900">
                <Users className="mr-2 h-6 w-6 text-indigo-600" />
                Core Values
              </CardTitle>
              <CardDescription className="text-gray-600">
                3-7 rules that define your culture and Right People
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {blueprintData.coreValues.map((value) => (
                <div key={value.id} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{value.value}</h4>
                    {value.description && (
                      <p className="text-sm text-gray-600 mt-1">{value.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCoreValue(value)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCoreValue(value.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <Button onClick={handleAddCoreValue} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Core Value
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Core Focus (Hedgehog) */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center text-xl text-gray-900">
                <Target className="mr-2 h-6 w-6 text-indigo-600" />
                Hedgehog
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your sweet spot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display saved values or edit form */}
              {(!editingCoreFocus && (blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] || blueprintData.coreFocus.niche)) ? (
                <>
                  {/* Purpose/Cause/Passion Display */}
                  {blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {blueprintData.coreFocus.hedgehogType.charAt(0).toUpperCase() + blueprintData.coreFocus.hedgehogType.slice(1)}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType]}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCoreFocus(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Niche Display */}
                  {blueprintData.coreFocus.niche && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Niche</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.coreFocus.niche}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCoreFocus(true)}
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
                    <Label>Select your Hedgehog type</Label>
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
                    <Label htmlFor="niche">Niche</Label>
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
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Hedgehog
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

          {/* BHAG (Big Hairy Audacious Goal) */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center text-xl text-gray-900">
                <TrendingUp className="mr-2 h-6 w-6 text-indigo-600" />
                Big Hairy Audacious Goal (BHAG)
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your Long Range Vision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display saved values or edit form */}
              {(!editingBHAG && (blueprintData.bhag.year || blueprintData.bhag.description)) ? (
                <>
                  {/* Year Display */}
                  {blueprintData.bhag.year && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Target Year</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.bhag.year}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBHAG(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Description Display */}
                  {blueprintData.bhag.description && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">BHAG Description</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.bhag.description}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBHAG(true)}
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
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {!blueprintData.bhag.year && !blueprintData.bhag.description 
                        ? 'Add BHAG' 
                        : 'Complete BHAG'}
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
                    <Label htmlFor="bhagDescription">BHAG Description</Label>
                    <Textarea
                      id="bhagDescription"
                      value={blueprintData.bhag.description}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        bhag: { ...prev.bhag, description: e.target.value }
                      }))}
                      placeholder="Describe your Big Hairy Audacious Goal..."
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={async () => {
                        await handleSaveBHAG();
                        setEditingBHAG(false);
                      }} 
                      disabled={saving} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save BHAG
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
                <Lightbulb className="mr-2 h-6 w-6 text-indigo-600" />
                Marketing Strategy
              </CardTitle>
              <CardDescription className="text-gray-600">
                Who you want to talk to and what you say when you do
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display saved values or edit form */}
              {(!editingMarketingStrategy && (
                blueprintData.marketingStrategy.targetMarket || 
                blueprintData.marketingStrategy.differentiators.some(d => d) ||
                blueprintData.marketingStrategy.provenProcessExists ||
                blueprintData.marketingStrategy.guaranteeExists
              )) ? (
                <>
                  {/* Target Market Display */}
                  {blueprintData.marketingStrategy.targetMarket && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Target Market</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.marketingStrategy.targetMarket}
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
                  
                  {/* Differentiators Display */}
                  {blueprintData.marketingStrategy.differentiators.filter(d => d).length > 0 && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Differentiators</h4>
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
                  {blueprintData.marketingStrategy.provenProcessExists && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Proven Process</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          ✓ Yes, we have a proven process
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
                  {blueprintData.marketingStrategy.guaranteeExists && (
                    <div className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Guarantee</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprintData.marketingStrategy.guaranteeDescription || '✓ Yes, we offer a guarantee'}
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
                   !blueprintData.marketingStrategy.differentiators.some(d => d) &&
                   !blueprintData.marketingStrategy.provenProcessExists &&
                   !blueprintData.marketingStrategy.guaranteeExists && (
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
                  <div>
                    <Label htmlFor="targetMarket">Target Market</Label>
                    <Textarea
                      id="targetMarket"
                      value={blueprintData.marketingStrategy.targetMarket}
                      onChange={(e) => setBlueprintData(prev => ({
                        ...prev,
                        marketingStrategy: { ...prev.marketingStrategy, targetMarket: e.target.value }
                      }))}
                      placeholder="Describe your target market..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Differentiators (3-5)</Label>
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
                    <Label htmlFor="provenProcess">Proven Process</Label>
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
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Marketing Strategy
                    </Button>
                    {(blueprintData.marketingStrategy.targetMarket || 
                      blueprintData.marketingStrategy.differentiators.some(d => d) ||
                      blueprintData.marketingStrategy.provenProcessExists ||
                      blueprintData.marketingStrategy.guaranteeExists) && (
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

          {/* Right Column - 3-Year Picture */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 overflow-hidden h-full">
              <CardHeader className="bg-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-xl text-gray-900">
                      <Calendar className="mr-2 h-6 w-6 text-indigo-600" />
                      3-Year Picture
                    </CardTitle>
                    <CardDescription className="text-gray-600">Your organization's 3-year vision</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowThreeYearDialog(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {blueprintData.threeYearPicture ? (
                  <div className="space-y-4">
                    {/* Target Date */}
                    {blueprintData.threeYearPicture.future_date && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 text-indigo-600 mr-3 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">Target Date</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {(() => {
                                // Parse date string manually to avoid timezone issues
                                const [year, month, day] = blueprintData.threeYearPicture.future_date.split('T')[0].split('-');
                                const date = new Date(year, month - 1, day);
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
                    {(blueprintData.threeYearPicture.revenue || blueprintData.threeYearPicture.profit) && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start">
                          <DollarSign className="h-5 w-5 text-indigo-600 mr-3 mt-0.5" />
                          <div className="flex-1 space-y-3">
                            <h4 className="font-semibold text-gray-900">Financial Goals</h4>
                            {blueprintData.threeYearPicture.revenue && (
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  {getRevenueLabelWithSuffix(organization, 'Target')}
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                  ${Number(blueprintData.threeYearPicture.revenue) < 1 
                                    ? `${(Number(blueprintData.threeYearPicture.revenue) * 1000).toFixed(0)}K`
                                    : `${Number(blueprintData.threeYearPicture.revenue).toFixed(1)}M`}
                                </p>
                              </div>
                            )}
                            {blueprintData.threeYearPicture.profit && (
                              <div>
                                <p className="text-sm font-medium text-gray-700">Profit Target</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {blueprintData.threeYearPicture.profit}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Key Measurables */}
                    {blueprintData.threeYearPicture.measurables && blueprintData.threeYearPicture.measurables.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center mb-2">
                          <BarChart3 className="h-5 w-5 text-indigo-600 mr-2" />
                          <h4 className="font-semibold text-gray-900">Key Measurables</h4>
                        </div>
                        {blueprintData.threeYearPicture.measurables.map((measurable, index) => (
                          <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-start">
                              <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{measurable.name}</p>
                                {measurable.target_value && (
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    Target: <span className="font-semibold">{measurable.target_value}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* What Does It Look Like */}
                    {blueprintData.threeYearPicture.lookLikeItems && blueprintData.threeYearPicture.lookLikeItems.filter(item => item).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center mb-2">
                          <Eye className="h-5 w-5 text-indigo-600 mr-2" />
                          <h4 className="font-semibold text-gray-900">What does it look like?</h4>
                        </div>
                        {blueprintData.threeYearPicture.lookLikeItems.filter(item => item).map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <p className="text-sm text-gray-700">{item}</p>
                          </div>
                        ))}
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
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create 3-Year Picture
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>1-Year Plan</CardTitle>
                  <CardDescription>Your goals for the next year</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowOneYearDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {blueprintData.oneYearPlan ? (
                <div className="space-y-4">
                  {blueprintData.oneYearPlan.future_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Target Date</p>
                      <p className="text-lg font-semibold">
                        {new Date(blueprintData.oneYearPlan.future_date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                  {blueprintData.oneYearPlan.revenue && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">{getRevenueLabelWithSuffix(organization, 'Target')}</p>
                      <p className="text-lg font-semibold">
                        ${Number(blueprintData.oneYearPlan.revenue) < 1 
                          ? `${(Number(blueprintData.oneYearPlan.revenue) * 1000).toFixed(0)}K`
                          : `${Number(blueprintData.oneYearPlan.revenue).toFixed(0)}M`}
                      </p>
                    </div>
                  )}
                  {blueprintData.oneYearPlan.profit && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Profit Target</p>
                      <p className="text-lg font-semibold">{blueprintData.oneYearPlan.profit}%</p>
                    </div>
                  )}
                  {blueprintData.oneYearPlan.measurables && blueprintData.oneYearPlan.measurables.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Key Measurables</p>
                      <ul className="space-y-2">
                        {blueprintData.oneYearPlan.measurables.map((measurable, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-indigo-600 mr-2">•</span>
                            <div className="flex-1">
                              <p className="font-medium">{measurable.name}</p>
                              {measurable.target_value && (
                                <p className="text-sm text-gray-600">Target: {measurable.target_value}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {blueprintData.oneYearPlan.goals && Array.isArray(blueprintData.oneYearPlan.goals) && blueprintData.oneYearPlan.goals.filter(goal => goal).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Goals</p>
                      <ol className="space-y-2">
                        {blueprintData.oneYearPlan.goals.filter(goal => goal).map((goal, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-indigo-600 font-medium mr-2">{index + 1}.</span>
                            <span className="text-gray-700">{goal}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No 1-Year Plan set yet</p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowOneYearDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create 1-Year Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quarterly Priorities</CardTitle>
                  <CardDescription>Summary of priorities for this quarter</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {blueprintData.quarterlyPriorities && blueprintData.quarterlyPriorities.priorities && blueprintData.quarterlyPriorities.priorities.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {blueprintData.quarterlyPriorities.quarter} {blueprintData.quarterlyPriorities.year} Priorities
                    </p>
                    
                    {/* Company Priorities */}
                    {blueprintData.quarterlyPriorities.priorities.some(p => p.is_company_priority) && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Company Priorities</h4>
                        <ol className="space-y-2">
                          {blueprintData.quarterlyPriorities.priorities
                            .filter(p => p.is_company_priority)
                            .map((priority, index) => (
                              <li key={priority.id} className="flex items-start">
                                <span className="text-indigo-600 font-medium mr-2">{index + 1}.</span>
                                <span className="text-gray-700">{priority.title || priority.text}</span>
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                    
                    {/* Individual Priorities */}
                    {blueprintData.quarterlyPriorities.priorities.some(p => !p.is_company_priority) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Individual Priorities</h4>
                        <ol className="space-y-2">
                          {blueprintData.quarterlyPriorities.priorities
                            .filter(p => !p.is_company_priority)
                            .map((priority, index) => (
                              <li key={priority.id} className="flex items-start">
                                <span className="text-indigo-600 font-medium mr-2">{index + 1}.</span>
                                <div>
                                  <span className="text-gray-700">{priority.title || priority.text}</span>
                                  {priority.owner_name && (
                                    <span className="text-xs text-gray-500 ml-2">({priority.owner_name})</span>
                                  )}
                                </div>
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <Link 
                      to="/quarterly-priorities" 
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium inline-flex items-center"
                    >
                      View full quarterly priorities page →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No quarterly priorities set</p>
                  <Link 
                    to="/quarterly-priorities" 
                    className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center"
                  >
                    Go to Quarterly Priorities →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Issues</CardTitle>
                  <CardDescription>Long term issues to address</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {blueprintData.longTermIssues && blueprintData.longTermIssues.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <ol className="space-y-2">
                      {blueprintData.longTermIssues.map((issue, index) => (
                        <li key={issue.id || index} className="flex items-start">
                          <span className="text-indigo-600 font-medium mr-2">{index + 1}.</span>
                          <span className="text-gray-700">{issue.title}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="pt-4 border-t">
                    <Link 
                      to="/issues?timeline=long_term" 
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium inline-flex items-center"
                    >
                      View all long term issues →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No long term issues</p>
                  <Link 
                    to="/issues" 
                    className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center"
                  >
                    Go to Issues →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Core Value Edit Dialog */}
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

      </div>
    </div>
  );
};

export default BusinessBlueprintPage;