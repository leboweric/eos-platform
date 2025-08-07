import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Target, 
  Calendar, 
  Zap,
  ArrowRight,
  Skip
} from 'lucide-react';

const BulkUpdateModal = ({ 
  isOpen, 
  onClose, 
  metrics = [], 
  currentPeriod, 
  type = 'weekly',
  onSave,
  currentScores = {}
}) => {
  const [updates, setUpdates] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState('guided'); // guided, bulk

  useEffect(() => {
    if (isOpen && metrics.length > 0) {
      // Initialize with current scores
      const initialUpdates = {};
      metrics.forEach(metric => {
        const currentScore = currentScores[metric.id]?.[currentPeriod] || '';
        initialUpdates[metric.id] = currentScore;
      });
      setUpdates(initialUpdates);
      setCurrentIndex(0);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, metrics, currentPeriod, currentScores]);

  const handleUpdateValue = (metricId, value) => {
    setUpdates(prev => ({
      ...prev,
      [metricId]: value
    }));
  };

  const handleNext = () => {
    if (currentIndex < metrics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    handleUpdateValue(metrics[currentIndex].id, '');
    handleNext();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Filter out empty values and prepare updates
      const validUpdates = Object.entries(updates)
        .filter(([_, value]) => value && value.toString().trim() !== '')
        .map(([metricId, value]) => ({
          metricId,
          value: value.toString(),
          period: currentPeriod
        }));

      if (validUpdates.length === 0) {
        throw new Error('Please enter at least one value to update');
      }

      await onSave(validUpdates);
      setSuccess(true);
      
      // Close after showing success briefly
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Failed to save updates');
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (value, valueType) => {
    if (!value && value !== 0) return '—';
    
    const numValue = parseFloat(value);
    switch (valueType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numValue);
      case 'percentage':
        return `${Math.round(numValue)}%`;
      default:
        return Math.round(numValue).toString();
    }
  };

  const formatGoal = (goal, valueType) => {
    if (!goal && goal !== 0) return 'No goal';
    return formatValue(goal, valueType);
  };

  const getUserInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getCompletedCount = () => {
    return Object.values(updates).filter(value => value && value.toString().trim() !== '').length;
  };

  const completionPercentage = metrics.length > 0 ? (getCompletedCount() / metrics.length) * 100 : 0;

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Updates Saved!</h3>
            <p className="text-gray-600">
              Successfully updated {getCompletedCount()} metrics for {type === 'weekly' ? 'this week' : 'this month'}.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Bulk Update - {type === 'weekly' ? 'Weekly' : 'Monthly'} Metrics</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                Update multiple metrics for {currentPeriod ? new Date(currentPeriod).toLocaleDateString() : 'current period'}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={mode === 'guided' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('guided')}
              >
                Guided
              </Button>
              <Button
                variant={mode === 'bulk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('bulk')}
              >
                Bulk
              </Button>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">
              {getCompletedCount()} of {metrics.length} completed
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {mode === 'guided' ? (
          /* Guided Mode - One metric at a time */
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {metrics.length > 0 && (
              <div className="space-y-4">
                {/* Current metric indicator */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{currentIndex + 1} of {metrics.length}</span>
                  <Badge variant="outline">
                    {Math.round(((currentIndex + 1) / metrics.length) * 100)}% complete
                  </Badge>
                </div>

                {/* Metric card */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700">
                        {getUserInitials(metrics[currentIndex].ownerName || metrics[currentIndex].owner)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {metrics[currentIndex].name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {metrics[currentIndex].ownerName || metrics[currentIndex].owner} • 
                          Goal: {formatGoal(metrics[currentIndex].goal, metrics[currentIndex].value_type)}
                        </p>
                        {metrics[currentIndex].description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {metrics[currentIndex].description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="metric-value" className="text-sm font-medium">
                          {type === 'weekly' ? 'Weekly' : 'Monthly'} Value
                        </Label>
                        <div className="flex items-center space-x-3">
                          <Input
                            id="metric-value"
                            type="number"
                            value={updates[metrics[currentIndex].id] || ''}
                            onChange={(e) => handleUpdateValue(metrics[currentIndex].id, e.target.value)}
                            placeholder={`Enter ${metrics[currentIndex].value_type === 'currency' ? 'amount' : 
                                        metrics[currentIndex].value_type === 'percentage' ? 'percentage' : 'number'}`}
                            className="flex-1"
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                if (currentIndex < metrics.length - 1) {
                                  handleNext();
                                } else {
                                  handleSave();
                                }
                              }
                            }}
                          />
                          {updates[metrics[currentIndex].id] && (
                            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Entered
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSkip}
                            className="text-gray-500"
                          >
                            <Skip className="h-3 w-3 mr-1" />
                            Skip
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={currentIndex < metrics.length - 1 ? handleNext : handleSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : currentIndex < metrics.length - 1 ? (
                            <>
                              Next
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </>
                          ) : (
                            <>
                              <Save className="h-3 w-3 mr-1" />
                              Save All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Bulk Mode - All metrics at once */
          <div className="max-h-96 overflow-y-auto space-y-3">
            {metrics.map((metric, index) => (
              <div key={metric.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {getUserInitials(metric.ownerName || metric.owner)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{metric.name}</p>
                  <p className="text-xs text-gray-600">
                    {metric.ownerName || metric.owner} • Goal: {formatGoal(metric.goal, metric.value_type)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={updates[metric.id] || ''}
                    onChange={(e) => handleUpdateValue(metric.id, e.target.value)}
                    placeholder="Value"
                    className="w-20 h-8 text-sm"
                  />
                  {updates[metric.id] && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {mode === 'bulk' && (
            <Button onClick={handleSave} disabled={saving || getCompletedCount() === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Updates ({getCompletedCount()})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateModal;