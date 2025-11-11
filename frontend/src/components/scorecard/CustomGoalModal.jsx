import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CustomGoalModal = ({ 
  isOpen, 
  onClose, 
  metric, 
  periodDate, 
  currentGoal,
  onSave 
}) => {
  const [customGoal, setCustomGoal] = useState('');
  const [customGoalMin, setCustomGoalMin] = useState('');
  const [customGoalMax, setCustomGoalMax] = useState('');
  const [customGoalNotes, setCustomGoalNotes] = useState('');

  useEffect(() => {
    if (isOpen && currentGoal) {
      setCustomGoal(currentGoal.goal !== null ? currentGoal.goal : '');
      setCustomGoalMin(currentGoal.min !== null ? currentGoal.min : '');
      setCustomGoalMax(currentGoal.max !== null ? currentGoal.max : '');
      setCustomGoalNotes(currentGoal.notes || '');
    } else if (isOpen) {
      setCustomGoal('');
      setCustomGoalMin('');
      setCustomGoalMax('');
      setCustomGoalNotes('');
    }
  }, [isOpen, currentGoal]);

  const handleSave = () => {
    const goalData = {
      customGoal: customGoal !== '' ? parseFloat(customGoal) : null,
      customGoalMin: customGoalMin !== '' ? parseFloat(customGoalMin) : null,
      customGoalMax: customGoalMax !== '' ? parseFloat(customGoalMax) : null,
      customGoalNotes: customGoalNotes || null
    };
    onSave(goalData);
    onClose();
  };

  const handleClear = () => {
    onSave({
      customGoal: null,
      customGoalMin: null,
      customGoalMax: null,
      customGoalNotes: null
    });
    onClose();
  };

  const isRangeGoal = metric?.comparison_operator === 'between';
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Custom Goal</DialogTitle>
          <DialogDescription>
            Set a custom goal for <strong>{metric?.name}</strong> on <strong>{formatDate(periodDate)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              Default Goal: <span className="font-semibold text-gray-900">{metric?.goal}</span>
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
                  placeholder={`Default: ${metric?.goal?.split('-')[0]?.trim() || ''}`}
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
                  placeholder={`Default: ${metric?.goal?.split('-')[1]?.trim() || ''}`}
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
                placeholder={`Default: ${metric?.goal || ''}`}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customGoalNotes">Notes (Optional)</Label>
            <Textarea
              id="customGoalNotes"
              value={customGoalNotes}
              onChange={(e) => setCustomGoalNotes(e.target.value)}
              placeholder="Why does this period have a custom goal?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {currentGoal && (
            <Button variant="outline" onClick={handleClear}>
              Clear Custom Goal
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomGoalModal;
