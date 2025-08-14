import React, { useState, useEffect } from 'react';
import { Share2 as ShareIcon, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import sharedMetricsService from '../../services/sharedMetricsService';

const ShareMetricDialog = ({ open, onClose, metric, orgId, teamId, onSuccess }) => {
  const [formData, setFormData] = useState({
    shared_description: '',
    data_source: '',
    calculation_method: '',
    update_frequency: 'manual'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUnshareConfirm, setShowUnshareConfirm] = useState(false);

  useEffect(() => {
    if (metric && metric.is_shared) {
      // If metric is already shared, populate the form with existing data
      setFormData({
        shared_description: metric.shared_description || metric.description || '',
        data_source: metric.data_source || '',
        calculation_method: metric.calculation_method || '',
        update_frequency: metric.update_frequency || 'manual'
      });
    } else if (metric) {
      // Reset form for new share
      setFormData({
        shared_description: metric.description || '',
        data_source: '',
        calculation_method: '',
        update_frequency: 'manual'
      });
    }
  }, [metric]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleShare = async () => {
    if (!formData.shared_description.trim()) {
      setError('Please provide a description for other teams');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sharedMetricsService.shareMetric(orgId, teamId, metric.id, formData);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share metric');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async () => {
    setLoading(true);
    setError(null);

    try {
      await sharedMetricsService.unshareMetric(orgId, teamId, metric.id);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unshare metric');
    } finally {
      setLoading(false);
      setShowUnshareConfirm(false);
    }
  };

  if (!metric) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShareIcon className="h-5 w-5 text-blue-600" />
            {metric.is_shared ? 'Manage Shared Metric' : 'Share Metric'}: {metric.name}
          </DialogTitle>
          <DialogDescription>
            {metric.is_shared 
              ? 'Update sharing settings or stop sharing this metric with other teams.'
              : 'Share this metric with other teams in your organization. They can subscribe to it and track their own goals.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showUnshareConfirm ? (
            <Alert>
              <AlertDescription>
                <p className="font-semibold mb-2">Are you sure you want to stop sharing this metric?</p>
                <p className="text-sm mb-3">
                  Other teams that have subscribed to this metric will keep their local copies, but they won't receive any future updates.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleUnshare}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unsharing...
                      </>
                    ) : (
                      'Yes, Stop Sharing'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUnshareConfirm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="description">Description for Other Teams *</Label>
                <Textarea
                  id="description"
                  placeholder="Explain what this metric measures and how other teams should use it"
                  value={formData.shared_description}
                  onChange={(e) => handleChange('shared_description', e.target.value)}
                  className="min-h-[80px]"
                  required
                />
                <p className="text-sm text-gray-500">
                  Explain what this metric measures and how other teams should use it
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="data_source">Data Source</Label>
                <Input
                  id="data_source"
                  placeholder="e.g., CRM, Google Analytics"
                  value={formData.data_source}
                  onChange={(e) => handleChange('data_source', e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Where does the data for this metric come from?
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="calculation_method">Calculation Method</Label>
                <Textarea
                  id="calculation_method"
                  placeholder="How is this metric calculated? Include any formulas if applicable"
                  value={formData.calculation_method}
                  onChange={(e) => handleChange('calculation_method', e.target.value)}
                  className="min-h-[60px]"
                />
                <p className="text-sm text-gray-500">
                  How is this metric calculated? Include any formulas if applicable
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="update_frequency">Update Frequency</Label>
                <Select
                  value={formData.update_frequency}
                  onValueChange={(value) => handleChange('update_frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-sm space-y-1">
                    <p><strong>Current Settings:</strong></p>
                    <p>Type: {metric.type}</p>
                    <p>Value Type: {metric.value_type}</p>
                    <p>Goal: {metric.goal}</p>
                    <p>Comparison: {metric.comparison_operator === 'greater_equal' ? '≥' : 
                                metric.comparison_operator === 'less_equal' ? '≤' : '='}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {!showUnshareConfirm && (
          <DialogFooter className="flex justify-between">
            {metric.is_shared && (
              <Button
                variant="outline"
                onClick={() => setShowUnshareConfirm(true)}
                disabled={loading}
                className="mr-auto text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Stop Sharing
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {metric.is_shared ? 'Updating...' : 'Sharing...'}
                  </>
                ) : (
                  <>
                    <ShareIcon className="mr-2 h-4 w-4" />
                    {metric.is_shared ? 'Update Sharing' : 'Share Metric'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareMetricDialog;