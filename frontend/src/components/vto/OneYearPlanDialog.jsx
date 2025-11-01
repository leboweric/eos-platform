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
import { useAuthStore } from '../../stores/authStore';
import { getOrgTheme } from '../../utils/themeUtils';

const OneYearPlanDialog = ({ open, onOpenChange, data, onSave, organization }) => {
  const { user } = useAuthStore();
  
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
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
        revenue: (() => {
          // First check if there's a "Total Revenue" stream
          const totalRevenueStream = data.revenueStreams?.find(s => s.name === 'Total Revenue');
          if (totalRevenueStream?.revenue_target) {
            return totalRevenueStream.revenue_target;
          }
          // Fall back to direct revenue fields
          return data.revenue_target || data.revenue || '';
        })(),
        profit: data.profit_percentage || data.profit || '',
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
      // Just save the profit as-is, no parsing needed
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
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}>
                <Calendar className="h-5 w-5 text-white" />
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
                  onClick={() => {
                    const newStreams = [...formData.revenueStreams];
                    
                    // If this is the first stream being added and there's a revenue value,
                    // convert the single revenue field into a "Total Revenue" stream first
                    if (newStreams.length === 0 && formData.revenue) {
                      newStreams.push({ name: 'Total Revenue', revenue_target: formData.revenue });
                    }
                    
                    // Add the new empty stream
                    newStreams.push({ name: '', revenue_target: '' });
                    
                    setFormData({
                      ...formData,
                      revenueStreams: newStreams
                    });
                  }}
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
                        className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                        style={{ '--focus-color': themeColors.primary }}
                        onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
                      />
                      <Input
                        type="text"
                        placeholder="e.g., $635K"
                        value={stream.revenue_target}
                        onChange={(e) => {
                          const newStreams = [...formData.revenueStreams];
                          newStreams[index].revenue_target = e.target.value;
                          setFormData({ ...formData, revenueStreams: newStreams });
                        }}
                        className="w-32 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                        style={{ '--focus-color': themeColors.primary }}
                        onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
                      />
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
                  <p className="text-xs text-gray-500">Enter revenue targets in any format</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="revenue">{getRevenueLabelWithSuffix(organization, 'Target')}</Label>
                  <Input
                    id="revenue"
                    type="text"
                    value={formData.revenue}
                    onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                    placeholder="e.g., $635K, $10M, or 2.5M"
                    className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                    style={{ '--focus-color': themeColors.primary }}
                    onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                    onBlur={(e) => e.target.style.borderColor = ''}
                  />
                  <p className="text-xs text-gray-500">Enter in any format (e.g., $635K, $10M, 2.5M)</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit">Profit Target</Label>
              <Input
                id="profit"
                type="text"
                value={formData.profit}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow user to type freely - we'll parse on save
                  setFormData({ ...formData, profit: value });
                }}
                placeholder="e.g., 15% or $1,500,000"
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                style={{ '--focus-color': themeColors.primary }}
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
              <p className="text-xs text-gray-500">Enter as percentage (15%) or dollar amount ($1.5M)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                        style={{ '--focus-color': themeColors.primary }}
                        onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
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
                      className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                        style={{ '--focus-color': themeColors.primary }}
                        onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
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
                      className="w-32 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                        style={{ '--focus-color': themeColors.primary }}
                        onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
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
                        className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 "
                        style={{ '--focus-color': themeColors.primary }}
                        onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                        onBlur={(e) => e.target.style.borderColor = ''}
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
              className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
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