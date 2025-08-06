import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { aiRockAssistantService } from '../../services/aiRockAssistantService';

const RockDialog = ({ open, onOpenChange, rock, onSave }) => {
  const navigate = useNavigate();
  const { orgId } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'individual', // 'company' or 'individual'
    owner: '',
    dueDate: new Date(),
    department: '',
    status: 'on-track'
  });
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartScore, setSmartScore] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showAiHelp, setShowAiHelp] = useState(false);

  useEffect(() => {
    if (rock) {
      setFormData({
        title: rock.title || '',
        description: rock.description || '',
        type: rock.type || 'individual',
        owner: rock.owner || '',
        dueDate: rock.dueDate ? new Date(rock.dueDate) : new Date(),
        department: rock.department || '',
        status: rock.status || 'on-track'
      });
    } else {
      // Reset form for new priority
      setFormData({
        title: '',
        description: '',
        type: 'individual',
        owner: '',
        dueDate: new Date(),
        department: '',
        status: 'on-track'
      });
    }
  }, [rock]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...rock,
      ...formData,
      dueDate: formData.dueDate.toISOString()
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
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{rock ? 'Edit Priority' : 'Create New Priority'}</DialogTitle>
                <DialogDescription>
                  Define a quarterly priority that moves your organization forward.
                </DialogDescription>
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Priority Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Launch new customer portal"
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={analyzeWithAI}
                  disabled={!formData.title || isAnalyzing}
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Get AI Help
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what success looks like for this Priority..."
                rows={3}
              />
            </div>

            {/* AI Suggestion Section */}
            {showAiHelp && aiSuggestion && (
              <Alert className="border-blue-200 bg-blue-50">
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold">AI Suggestion:</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Improved Title:</span>
                        <p className="text-sm">{aiSuggestion.title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Improved Description:</span>
                        <p className="text-sm">{aiSuggestion.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={applySuggestion}
                      >
                        Apply Suggestion
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAiHelp(false)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Priority Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company" className="font-normal">
                    Company Priority (shared across the organization)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="font-normal">
                    Individual Priority (assigned to one person)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Who owns this Priority?"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, Marketing"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => date && setFormData({ ...formData, dueDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="off-track">Off Track</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {rock ? 'Save Priority' : 'Create Priority'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RockDialog;