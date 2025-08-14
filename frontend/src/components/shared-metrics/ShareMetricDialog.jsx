import React, { useState } from 'react';
import { Share2 as ShareIcon, Loader2 } from 'lucide-react';
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
    shared_description: metric?.description || '',
    data_source: '',
    calculation_method: '',
    update_frequency: 'manual'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
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

  if (!metric) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShareIcon className="h-5 w-5 text-blue-600" />
            Share Metric: {metric.name}
          </DialogTitle>
          <DialogDescription>
            Share this metric with other teams in your organization. They can subscribe to it and track their own goals.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <ShareIcon className="mr-2 h-4 w-4" />
                Share Metric
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareMetricDialog;