import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { businessBlueprintService } from '../services/businessBlueprintService';
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
  Edit
} from 'lucide-react';

const BusinessBlueprintPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('vision');
  
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
      differentiator1: '',
      differentiator2: '',
      differentiator3: '',
      provenProcessExists: false,
      guaranteeExists: false
    },
    threeYearPicture: null,
    oneYearPlan: null
  });

  // New core value form
  const [newCoreValue, setNewCoreValue] = useState({ value: '', description: '' });
  const [editingCoreValue, setEditingCoreValue] = useState(null);
  const [showCoreValueDialog, setShowCoreValueDialog] = useState(false);
  
  // Dialog states for planning sections
  const [showThreeYearDialog, setShowThreeYearDialog] = useState(false);
  const [showOneYearDialog, setShowOneYearDialog] = useState(false);
  const [showQuarterlyDialog, setShowQuarterlyDialog] = useState(false);

  useEffect(() => {
    fetchBusinessBlueprint();
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
          purpose: data.coreFocus?.purpose || '',
          cause: data.coreFocus?.cause || '',
          passion: data.coreFocus?.passion || '',
          niche: data.coreFocus?.niche || '',
          hedgehogType: data.coreFocus?.hedgehogType || 'purpose'
        },
        bhag: {
          description: data.tenYearTarget?.target_description || '',
          year: data.tenYearTarget?.target_year || new Date().getFullYear() + 10,
          runningTotal: data.tenYearTarget?.running_total_description || ''
        },
        marketingStrategy: {
          targetMarket: data.marketingStrategy?.target_market || '',
          differentiator1: data.marketingStrategy?.differentiator_1 || '',
          differentiator2: data.marketingStrategy?.differentiator_2 || '',
          differentiator3: data.marketingStrategy?.differentiator_3 || '',
          provenProcessExists: data.marketingStrategy?.proven_process_exists || false,
          guaranteeExists: data.marketingStrategy?.guarantee_exists || false
        },
        threeYearPicture: data.threeYearPicture,
        oneYearPlan: data.oneYearPlan
      });
    } catch (error) {
      console.error('Failed to fetch business blueprint:', error);
      setError('Failed to load business blueprint data');
    } finally {
      setLoading(false);
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
      await businessBlueprintService.updateCoreFocus(blueprintData.coreFocus);
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
      await businessBlueprintService.updateMarketingStrategy(blueprintData.marketingStrategy);
      setSuccess('Marketing strategy updated successfully');
    } catch (error) {
      setError('Failed to update marketing strategy');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Blueprint</h1>
          <p className="text-gray-600 mt-2">Define your organization's vision and strategy</p>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vision">Vision</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
        </TabsList>

        <TabsContent value="vision" className="space-y-6">
          {/* Core Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Core Values
              </CardTitle>
              <CardDescription>
                3-7 rules that define your culture and Right People
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {blueprintData.coreValues.map((value) => (
                <div key={value.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{value.value}</h4>
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
                <Button onClick={handleAddCoreValue} disabled={saving}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Core Value
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Core Focus (Hedgehog) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Hedgehog
              </CardTitle>
              <CardDescription>
                Your organization's core focus - what drives you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <Button onClick={handleSaveCoreFocus} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Hedgehog
              </Button>
            </CardContent>
          </Card>

          {/* BHAG (Big Hairy Audacious Goal) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Big Hairy Audacious Goal (BHAG)
              </CardTitle>
              <CardDescription>
                Your 10+ year ambitious goal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div>
                <Label htmlFor="runningTotal">Running Total (optional)</Label>
                <Input
                  id="runningTotal"
                  value={blueprintData.bhag.runningTotal}
                  onChange={(e) => setBlueprintData(prev => ({
                    ...prev,
                    bhag: { ...prev.bhag, runningTotal: e.target.value }
                  }))}
                  placeholder="e.g., $50M ARR"
                />
              </div>

              <Button onClick={handleSaveBHAG} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save BHAG
              </Button>
            </CardContent>
          </Card>

          {/* Marketing Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-5 w-5" />
                Marketing Strategy
              </CardTitle>
              <CardDescription>
                Who you want to talk to and what you say when you do
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label>3 Differentiators</Label>
                <div className="space-y-2 mt-2">
                  <Input
                    placeholder="Differentiator 1"
                    value={blueprintData.marketingStrategy.differentiator1}
                    onChange={(e) => setBlueprintData(prev => ({
                      ...prev,
                      marketingStrategy: { ...prev.marketingStrategy, differentiator1: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="Differentiator 2"
                    value={blueprintData.marketingStrategy.differentiator2}
                    onChange={(e) => setBlueprintData(prev => ({
                      ...prev,
                      marketingStrategy: { ...prev.marketingStrategy, differentiator2: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="Differentiator 3"
                    value={blueprintData.marketingStrategy.differentiator3}
                    onChange={(e) => setBlueprintData(prev => ({
                      ...prev,
                      marketingStrategy: { ...prev.marketingStrategy, differentiator3: e.target.value }
                    }))}
                  />
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

              <Button onClick={handleSaveMarketingStrategy} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Marketing Strategy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3-Year Picture</CardTitle>
                  <CardDescription>Your organization's 3-year vision</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => alert('3-Year Picture editing coming soon!')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Click edit to define your 3-year vision</p>
            </CardContent>
          </Card>

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
                  onClick={() => alert('1-Year Plan editing coming soon!')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Click edit to define your 1-year plan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quarterly Priorities</CardTitle>
                  <CardDescription>Your priorities for this quarter</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => alert('Quarterly Priorities editing coming soon!')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Click edit to define your quarterly priorities</p>
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
    </div>
  );
};

export default BusinessBlueprintPage;