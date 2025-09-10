import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { aiRockAssistantService } from '../../services/aiRockAssistantService';
import { useAuthStore } from '../../stores/authStore';
import { getOrgTheme } from '../../utils/themeUtils';

const RockDialog = ({ open, onOpenChange, rock, onSave }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { orgId } = useParams();
  
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'individual', // 'company' or 'individual'
    owner: '',
    dueDate: null,
    department: '',
    status: 'on-track'
  });
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartScore, setSmartScore] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showAiHelp, setShowAiHelp] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      const orgId = user?.organizationId || user?.organization_id;
      if (orgId) {
        const theme = await getOrgTheme(orgId);
        if (theme && theme.primary && theme.secondary) {
          setThemeColors(theme);
        }
      }
    };
    fetchTheme();
  }, [user]);

  useEffect(() => {
    if (rock) {
      // Parse the date properly - if it's already in YYYY-MM-DD format, parse it correctly
      let parsedDate = new Date();
      if (rock.dueDate) {
        // If the date is in YYYY-MM-DD format, add time to avoid timezone issues
        if (typeof rock.dueDate === 'string' && rock.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(rock.dueDate + 'T12:00:00');
        } else {
          parsedDate = new Date(rock.dueDate);
        }
      }
      
      setFormData({
        title: rock.title || '',
        description: rock.description || '',
        type: rock.type || 'individual',
        owner: rock.owner || '',
        dueDate: parsedDate,
        department: rock.department || '',
        status: rock.status || 'on-track'
      });
    } else {
      // Reset form for new priority - no default date, user must select
      setFormData({
        title: '',
        description: '',
        type: 'individual',
        owner: '',
        dueDate: null,
        department: '',
        status: 'on-track'
      });
    }
  }, [rock]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate that due date is selected
    if (!formData.dueDate) {
      // Show error - you could also set a state variable to show an error message
      alert('Please select a due date for this priority');
      return;
    }
    
    // Format date as YYYY-MM-DD to preserve the user's selected date without timezone conversion
    const year = formData.dueDate.getFullYear();
    const month = String(formData.dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(formData.dueDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    onSave({
      ...rock,
      ...formData,
      dueDate: formattedDate
    });
    onOpenChange(false);
  };
  
  const analyzeWithAI = async () => {
    if (!formData.title) return;
    
    setIsAnalyzing(true);
    setShowAiHelp(true);
    
    try {
      const result = await aiRockAssistantService.analyzeRock(orgId || localStorage.getItem('orgId'), {
        title: formData.title,
        description: formData.description,
        saveAnalysis: false
      });
      
      if (result.success) {
        setSmartScore(result.analysis.overallScore);
        setAiSuggestion(result.analysis.suggestedRewrite);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const applySuggestion = () => {
    if (aiSuggestion) {
      setFormData({
        ...formData,
        title: aiSuggestion.title,
        description: aiSuggestion.description
      });
      setShowAiHelp(false);
      setAiSuggestion(null);
    }
  };
  
  const openFullAssistant = () => {
    onOpenChange(false);
    navigate(`/organizations/${orgId || localStorage.getItem('orgId')}/smart-rock-assistant`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}>
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{rock ? 'Edit Priority' : 'Create New Priority'}</DialogTitle>
                  <DialogDescription className="text-slate-600 mt-1">
                    Define a quarterly priority that moves your organization forward.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartScore !== null && (
                  <Badge variant={smartScore >= 80 ? 'default' : smartScore >= 60 ? 'secondary' : 'destructive'}>
                    SMART Score: {smartScore}%
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openFullAssistant}
                  className="gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Full Assistant
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
                Priority Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Launch new customer portal"
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                style={{ '--focus-color': themeColors.primary }}
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
                required
              />
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={analyzeWithAI}
                  disabled={!formData.title || isAnalyzing}
                  className="gap-2 bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Get AI Help
                </Button>
              </div>
              <RichTextEditor
                value={formData.description}
                onChange={(content) => setFormData({ ...formData, description: content })}
                placeholder="Describe what success looks like for this Priority..."
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm"
              />
            </div>

            {/* AI Suggestion Section */}
            {showAiHelp && aiSuggestion && (
              <Alert className="border-blue-200/50 bg-blue-50/80 backdrop-blur-sm rounded-xl">
                <Brain className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold text-blue-900">AI Suggestion:</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-slate-700">Improved Title:</span>
                        <p className="text-sm text-slate-600">{aiSuggestion.title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">Improved Description:</span>
                        <p className="text-sm text-slate-600">{aiSuggestion.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={applySuggestion}
                        className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                        }}
                      >
                        Apply Suggestion
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAiHelp(false)}
                        className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              <Label className="text-sm font-semibold text-slate-700">Priority Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company" className="font-normal text-slate-700">
                    Company Priority (shared across the organization)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="font-normal text-slate-700">
                    Individual Priority (assigned to one person)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="owner" className="text-sm font-semibold text-slate-700">
                  Owner <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Who owns this Priority?"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                style={{ '--focus-color': themeColors.primary }}
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="department" className="text-sm font-semibold text-slate-700">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, Marketing"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                style={{ '--focus-color': themeColors.primary }}
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label className="text-sm font-semibold text-slate-700">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`w-full justify-start text-left font-normal bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 ${
                        !formData.dueDate ? 'border-red-300 hover:border-red-400' : ''
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Select date (required)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => date && setFormData({ ...formData, dueDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="status" className="text-sm font-semibold text-slate-700">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="off-track">Off Track</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-white/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              {rock ? 'Save Priority' : 'Create Priority'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RockDialog;