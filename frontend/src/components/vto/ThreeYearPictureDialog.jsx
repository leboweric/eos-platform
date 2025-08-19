import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Plus, Trash2, Rocket } from 'lucide-react';
import { getRevenueLabel, getRevenueLabelWithSuffix } from '../../utils/revenueUtils';

const ThreeYearPictureDialog = ({ open, onOpenChange, data, onSave, organization }) => {
  // Calculate default date without timezone conversion
  const getDefaultDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3, 11, 31);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [formData, setFormData] = useState({
    revenue: '',
    profit: '',
    revenueStreams: [],
    measurables: [],
    lookLikeItems: [''],
    futureDate: getDefaultDate() // Default to Dec 31, 3 years from now
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      let futureDate;
      if (data.future_date) {
        // Handle date from database - ensure we're using the date as-is without timezone conversion
        // Since the database stores DATE (not TIMESTAMP), we should interpret it as a plain date
        const dateStr = data.future_date.split('T')[0]; // Get just YYYY-MM-DD part
        futureDate = dateStr;
      } else {
        // Default to Dec 31, 3 years from now - using local date to avoid timezone issues
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() + 3, 11, 31);
        // Format as YYYY-MM-DD in local timezone
        const year = defaultDate.getFullYear();
        const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
        const day = String(defaultDate.getDate()).padStart(2, '0');
        futureDate = `${year}-${month}-${day}`;
      }
      
      setFormData({
        revenue: data.revenue || '',
        profit: data.profit || '',
        revenueStreams: data.revenueStreams && data.revenueStreams.length > 0 
          ? data.revenueStreams.map(s => ({ name: s.name || '', revenue_target: s.revenue_target || '' }))
          : [],
        measurables: (data.measurables || []).map(m => ({
          name: m.name || '',
          value: m.target_value || m.value || ''
        })),
        lookLikeItems: data.lookLikeItems && data.lookLikeItems.length > 0 ? data.lookLikeItems : [''],
        futureDate: futureDate
      });
    }
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Send the date as-is, let the backend handle timezone
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setError(error.message || 'Failed to save Long-term Vision');
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <Rocket className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Long-term Vision (3 Years)
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 font-medium ml-11">
              Define your organization's vision for the next 3 years
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
                        className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
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
                          className="pl-6 pr-8 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
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
                      className="pl-8 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
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
                  className="pr-8 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500">Enter profit margin as a percentage</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="futureDate">Target Date</Label>
              <Input
                id="futureDate"
                type="date"
                value={formData.futureDate}
                onChange={(e) => setFormData({ ...formData, futureDate: e.target.value })}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
              />
              <p className="text-xs text-gray-500">Select the date 3 years from now</p>
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
              <p className="text-xs text-gray-500">What are the 5-15 most important measurables in 3 years?</p>
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
                      className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
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
                      className="w-32 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
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
                <Label>What Does It Look Like? ({formData.lookLikeItems.length} items)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      lookLikeItems: [...prev.lookLikeItems, '']
                    }));
                    // Scroll to bottom after adding new item
                    setTimeout(() => {
                      const scrollContainer = document.querySelector('.overflow-y-auto');
                      if (scrollContainer) {
                        scrollContainer.scrollTop = scrollContainer.scrollHeight;
                      }
                    }, 100);
                  }}
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.lookLikeItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Attribute ${index + 1}`}
                      value={item}
                      onChange={(e) => setFormData(prev => {
                        const newItems = [...prev.lookLikeItems];
                        newItems[index] = e.target.value;
                        return { ...prev, lookLikeItems: newItems };
                      })}
                      className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-blue-400"
                    />
                    {formData.lookLikeItems.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          lookLikeItems: prev.lookLikeItems.filter((_, i) => i !== index)
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Long-term Vision
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ThreeYearPictureDialog;