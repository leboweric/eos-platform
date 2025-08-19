import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Plus, Trash2, Calendar } from 'lucide-react';
import { getRevenueLabel, getRevenueLabelWithSuffix } from '../../utils/revenueUtils';
import { formatDateLocal } from '../../utils/dateUtils';

const OneYearPlanDialog = ({ open, onOpenChange, data, onSave, organization }) => {
  const [formData, setFormData] = useState({
    revenue: '',
    profit: '',
    revenueStreams: [],
    targetDate: formatDateLocal(new Date(new Date().getFullYear() + 1, 11, 31)), // Default to Dec 31, 1 year from now
    goals: ['', '', ''], // Start with 3 goals
    measurables: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      console.log('OneYearPlanDialog - Loading data:', data);
      console.log('OneYearPlanDialog - Goals from parent:', data.goals);
      
      const processedGoals = data.goals && Array.isArray(data.goals) && data.goals.length > 0 
        ? data.goals.map(g => {
            const goalText = typeof g === 'string' ? g : (g.goal_text || '');
            console.log('Processing goal:', g, '-> text:', goalText);
            return goalText;
          })
        : ['', '', ''];
      
      setFormData({
        revenue: data.revenue || '',
        profit: data.profit || '',
        revenueStreams: data.revenueStreams && data.revenueStreams.length > 0 
          ? data.revenueStreams.map(s => ({ name: s.name || '', revenue_target: s.revenue_target || '' }))
          : [],
        targetDate: data.future_date ? data.future_date.split('T')[0] : new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],
        goals: processedGoals,
        measurables: (data.measurables || []).map(m => ({
          name: m.name || '',
          value: m.target_value || m.value || ''
        }))
      });
    }
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      console.log('OneYearPlanDialog - Saving formData:', formData);
      console.log('OneYearPlanDialog - Goals being saved:', formData.goals);
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setError(error.message || 'Failed to save Annual Goals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 p-6 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Annual Goals
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 font-medium ml-11">
              Define your goals and targets for the coming year
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 p-6 overflow-y-auto flex-grow max-h-[calc(85vh-180px)]">
            {error && (
              <Alert className="border-red-200/50 bg-red-50/80 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* Revenue Streams Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Revenue Streams</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({
                    ...formData,
                    revenueStreams: [...formData.revenueStreams, { name: '', revenue_target: '' }]
                  })}
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stream
                </Button>
              </div>
              
              {formData.revenueStreams.length > 0 ? (
                <div className="space-y-3">
                  {formData.revenueStreams.map((stream, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Stream name (e.g., Accounting)"
                        value={stream.name}
                        onChange={(e) => {
                          const newStreams = [...formData.revenueStreams];
                          newStreams[index].name = e.target.value;
                          setFormData({ ...formData, revenueStreams: newStreams });
                        }}
                        className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.635"
                          value={stream.revenue_target}
                          onChange={(e) => {
                            const newStreams = [...formData.revenueStreams];
                            newStreams[index].revenue_target = e.target.value;
                            setFormData({ ...formData, revenueStreams: newStreams });
                          }}
                          className="pl-6 pr-8 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">M</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newStreams = formData.revenueStreams.filter((_, i) => i !== index);
                          setFormData({ ...formData, revenueStreams: newStreams });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">Enter revenue targets in millions (e.g., 0.635 for $635K)</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="revenue">{getRevenueLabelWithSuffix(organization, 'Target')} (in millions)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="revenue"
                      type="number"
                      step="0.001"
                      value={formData.revenue}
                      onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                      placeholder="0.635"
                      className="pl-8 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">M</span>
                  </div>
                  <p className="text-xs text-gray-500">Enter value in millions (e.g., 0.635 for $635K, 10 for $10M)</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit">Profit Target (%)</Label>
              <div className="relative">
                <Input
                  id="profit"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  placeholder="20"
                  className="pr-8 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500">Enter profit margin as a percentage</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
              />
              <p className="text-xs text-gray-500">Select the date 1 year from now</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Key Measurables</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    measurables: [...(prev.measurables || []), { name: '', value: '' }]
                  }))}
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">What are the 5-15 most important measurables for this year?</p>
              <div className="space-y-2">
                {(formData.measurables || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Measurable ${index + 1}`}
                      value={item.name || ''}
                      onChange={(e) => setFormData(prev => {
                        const newItems = [...(prev.measurables || [])];
                        newItems[index] = { ...newItems[index], name: e.target.value };
                        return { ...prev, measurables: newItems };
                      })}
                      className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                    />
                    <Input
                      type="text"
                      placeholder="Target value"
                      value={item.value || ''}
                      onChange={(e) => setFormData(prev => {
                        const newItems = [...(prev.measurables || [])];
                        newItems[index] = { ...newItems[index], value: e.target.value };
                        return { ...prev, measurables: newItems };
                      })}
                      className="w-32 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        measurables: (prev.measurables || []).filter((_, i) => i !== index)
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!formData.measurables || formData.measurables.length === 0) && (
                  <p className="text-sm text-gray-400 italic">Click + to add measurables</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Goals (3-7)</Label>
                {formData.goals.length < 10 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      goals: [...prev.goals, '']
                    }))}
                    className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {console.log('Goals array length:', formData.goals.length, 'Goals:', formData.goals)}
                {formData.goals.map((goal, index) => {
                  const showDeleteButton = formData.goals.length > 3;
                  console.log(`Goal ${index}: Show delete button?`, showDeleteButton);
                  return (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Goal ${index + 1}`}
                        value={typeof goal === 'string' ? goal : (goal?.goal_text || '')}
                        onChange={(e) => setFormData(prev => {
                          const newGoals = [...prev.goals];
                          newGoals[index] = e.target.value;
                          return { ...prev, goals: newGoals };
                        })}
                        className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-indigo-400"
                      />
                      {showDeleteButton && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            goals: prev.goals.filter((_, i) => i !== index)
                          }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t border-white/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Annual Goals
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OneYearPlanDialog;