import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, X } from 'lucide-react';

const CustomGoalSelectorModal = ({ 
  isOpen, 
  onClose, 
  metrics = [], 
  weekDates = [],
  customGoals = {},
  onSave 
}) => {
  const [selectedMetricId, setSelectedMetricId] = useState('');
  const [selectedWeekDate, setSelectedWeekDate] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [customGoalMin, setCustomGoalMin] = useState('');
  const [customGoalMax, setCustomGoalMax] = useState('');
  const [customGoalNotes, setCustomGoalNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMetricId('');
      setSelectedWeekDate('');
      setCustomGoal('');
      setCustomGoalMin('');
      setCustomGoalMax('');
      setCustomGoalNotes('');
    }
  }, [isOpen]);

  // Load existing custom goal when metric and week are selected
  useEffect(() => {
    if (selectedMetricId && selectedWeekDate) {
      const existingGoal = customGoals[selectedMetricId]?.[selectedWeekDate];
      if (existingGoal) {
        setCustomGoal(existingGoal.goal !== null ? existingGoal.goal.toString() : '');
        setCustomGoalMin(existingGoal.min !== null ? existingGoal.min.toString() : '');
        setCustomGoalMax(existingGoal.max !== null ? existingGoal.max.toString() : '');
        setCustomGoalNotes(existingGoal.notes || '');
      } else {
        // Load the metric's default goal
        const metric = metrics.find(m => m.id === parseInt(selectedMetricId));
        if (metric && metric.goal) {
          setCustomGoal(metric.goal.toString());
          setCustomGoalMin('');
          setCustomGoalMax('');
        } else {
          setCustomGoal('');
          setCustomGoalMin('');
          setCustomGoalMax('');
        }
        setCustomGoalNotes('');
      }
    }
  }, [selectedMetricId, selectedWeekDate, customGoals, metrics]);

  const handleSave = async () => {
    if (!selectedMetricId || !selectedWeekDate) {
      return;
    }

    setLoading(true);
    try {
      const metric = metrics.find(m => m.id === parseInt(selectedMetricId));
      const goalData = {
        customGoal: customGoal !== '' ? parseFloat(customGoal) : null,
        customGoalMin: customGoalMin !== '' ? parseFloat(customGoalMin) : null,
        customGoalMax: customGoalMax !== '' ? parseFloat(customGoalMax) : null,
        customGoalNotes: customGoalNotes || null
      };
      
      await onSave(metric, selectedWeekDate, goalData);
      onClose();
    } catch (error) {
      console.error('Error saving custom goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearGoal = async () => {
    if (!selectedMetricId || !selectedWeekDate) {
      return;
    }

    setLoading(true);
    try {
      const metric = metrics.find(m => m.id === parseInt(selectedMetricId));
      const goalData = {
        customGoal: null,
        customGoalMin: null,
        customGoalMax: null,
        customGoalNotes: null
      };
      
      await onSave(metric, selectedWeekDate, goalData);
      onClose();
    } catch (error) {
      console.error('Error clearing custom goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMetric = metrics.find(m => m.id === parseInt(selectedMetricId));
  
  // Debug logging
  console.log('CustomGoalSelectorModal Debug:', {
    selectedMetricId,
    metricsCount: metrics.length,
    selectedMetric,
    weekDatesCount: weekDates.length
  });
  const hasExistingCustomGoal = selectedMetricId && selectedWeekDate && 
    customGoals[selectedMetricId]?.[selectedWeekDate];
  const isRangeGoal = selectedMetric?.comparison_operator === 'between';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            <DialogTitle>Set Custom Weekly Goal</DialogTitle>
          </div>
          <DialogDescription>
            Override the default goal for a specific metric and week. This is useful for adjusting targets during special circumstances.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Metric Selection */}
          <div className="space-y-2">
            <Label htmlFor="metric">Select Metric</Label>
            <Select value={selectedMetricId} onValueChange={(value) => {
              console.log('Metric selected:', value);
              setSelectedMetricId(value);
            }}>
              <SelectTrigger id="metric">
                <SelectValue placeholder="Choose a metric..." />
              </SelectTrigger>
              <SelectContent>
                {metrics.map(metric => (
                  <SelectItem key={metric.id} value={metric.id.toString()}>
                    {metric.name} (Default: {metric.goal || 'No goal'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Week Selection */}
          <div className="space-y-2">
            <Label htmlFor="week">Select Week</Label>
            <Select 
              value={selectedWeekDate} 
              onValueChange={setSelectedWeekDate}
              disabled={!selectedMetricId}
            >
              <SelectTrigger id="week">
                <SelectValue placeholder="Choose a week..." />
              </SelectTrigger>
              <SelectContent>
                {weekDates.map(date => (
                  <SelectItem key={date} value={date}>
                    Week of {new Date(date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Goal Input(s) */}
          {selectedMetricId && selectedMetric && (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  Default Goal: <span className="font-semibold text-gray-900">{selectedMetric.goal || 'No goal'}</span>
                </Label>
              </div>

              {isRangeGoal ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customGoalMin">Custom Minimum Goal</Label>
                    <Input
                      id="customGoalMin"
                      type="number"
                      step="any"
                      value={customGoalMin}
                      onChange={(e) => setCustomGoalMin(e.target.value)}
                      placeholder={`Default: ${selectedMetric.goal?.split('-')[0]?.trim() || ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customGoalMax">Custom Maximum Goal</Label>
                    <Input
                      id="customGoalMax"
                      type="number"
                      step="any"
                      value={customGoalMax}
                      onChange={(e) => setCustomGoalMax(e.target.value)}
                      placeholder={`Default: ${selectedMetric.goal?.split('-')[1]?.trim() || ''}`}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="customGoal">Custom Goal</Label>
                  <Input
                    id="customGoal"
                    type="number"
                    step="any"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder={`Default: ${selectedMetric.goal || ''}`}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="customGoalNotes">Notes (Optional)</Label>
                <Textarea
                  id="customGoalNotes"
                  value={customGoalNotes}
                  onChange={(e) => setCustomGoalNotes(e.target.value)}
                  placeholder="Why does this week have a custom goal?"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Info Box */}
          {hasExistingCustomGoal && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> This metric already has a custom goal for this week. 
                Saving will update it.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasExistingCustomGoal && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearGoal}
              disabled={loading}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Custom Goal
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedMetricId || !selectedWeekDate || (!customGoal && !customGoalMin && !customGoalMax) || loading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Target className="h-4 w-4 mr-1" />
            {loading ? 'Saving...' : 'Save Custom Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomGoalSelectorModal;
