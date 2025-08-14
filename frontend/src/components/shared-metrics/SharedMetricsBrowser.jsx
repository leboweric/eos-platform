import React, { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Plus as AddIcon,
  Info as InfoIcon,
  Users as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ScheduleIcon,
  Database as DataUsageIcon,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import sharedMetricsService from '../../services/sharedMetricsService';

const SharedMetricsBrowser = ({ orgId, teamId, onSubscribe }) => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [subscribeDialog, setSubscribeDialog] = useState(false);
  const [customGoal, setCustomGoal] = useState('');
  const [subscriptionNotes, setSubscriptionNotes] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  useEffect(() => {
    fetchSharedMetrics();
  }, [orgId, teamId]);

  const fetchSharedMetrics = async () => {
    setLoading(true);
    try {
      const data = await sharedMetricsService.getSharedMetrics(orgId, teamId);
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching shared metrics:', err);
      setError('Failed to load shared metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedMetric) return;

    setSubscribing(true);
    setError(null);

    try {
      const subscriptionData = {
        source_metric_id: selectedMetric.id,
        goal: customGoal || selectedMetric.goal,
        subscription_notes: subscriptionNotes
      };

      await sharedMetricsService.subscribeToMetric(orgId, teamId, subscriptionData);
      
      // Refresh the list to update subscription status
      await fetchSharedMetrics();
      
      // Close dialog and reset
      setSubscribeDialog(false);
      setSelectedMetric(null);
      setCustomGoal('');
      setSubscriptionNotes('');
      
      onSubscribe && onSubscribe();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to subscribe to metric');
    } finally {
      setSubscribing(false);
    }
  };

  const filteredMetrics = metrics.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.shared_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.created_by_team_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getValueTypeIcon = (valueType) => {
    switch (valueType) {
      case 'currency':
        return '$';
      case 'percentage':
        return '%';
      default:
        return '#';
    }
  };

  const getComparisonOperatorSymbol = (operator) => {
    switch (operator) {
      case 'greater_equal':
        return '≥';
      case 'less_equal':
        return '≤';
      default:
        return '=';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search shared metrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Grid */}
      {filteredMetrics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              No shared metrics available. Teams can share their metrics for others to use.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map(metric => (
            <Card key={metric.id} className="relative">
              {metric.is_subscribed && (
                <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Subscribed
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{metric.name}</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <GroupsIcon className="h-3 w-3 mr-1" />
                      {metric.created_by_team_name || 'Organization'}
                    </Badge>
                    {metric.subscriber_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {metric.subscriber_count} subscribers
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  {metric.shared_description || metric.description}
                </p>

                <Separator className="my-3" />

                <div className="flex gap-4 text-xs text-gray-500 mb-3">
                  <span><strong>Type:</strong> {metric.type}</span>
                  <span><strong>Value:</strong> {getValueTypeIcon(metric.value_type)}</span>
                  <span><strong>Goal:</strong> {getComparisonOperatorSymbol(metric.comparison_operator)} {metric.goal}</span>
                </div>

                {metric.data_source && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <DataUsageIcon className="h-3 w-3" />
                    <span>Source: {metric.data_source}</span>
                  </div>
                )}

                {metric.update_frequency && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <ScheduleIcon className="h-3 w-3" />
                    <span>Updates: {metric.update_frequency}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMetric(metric);
                      setDetailsDialog(true);
                    }}
                  >
                    <InfoIcon className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  {!metric.is_subscribed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedMetric(metric);
                        setSubscribeDialog(true);
                      }}
                      className="flex-1"
                    >
                      <AddIcon className="h-4 w-4 mr-1" />
                      Subscribe
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialog} onOpenChange={setSubscribeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to: {selectedMetric?.name}</DialogTitle>
            <DialogDescription>
              Subscribing to this metric will create a copy for your team to track. 
              You can set your own goal while keeping the same measurement method.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goal">Your Team's Goal (optional)</Label>
              <Input
                id="goal"
                type="number"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder={`Default: ${selectedMetric?.goal}`}
              />
              <p className="text-sm text-gray-500">
                Leave blank to use the default goal: {selectedMetric?.goal}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={subscriptionNotes}
                onChange={(e) => setSubscriptionNotes(e.target.value)}
                placeholder="Why is your team adopting this metric?"
                className="min-h-[80px]"
              />
            </div>

            {selectedMetric?.calculation_method && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <strong>How it's calculated:</strong><br />
                  {selectedMetric.calculation_method}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialog(false)} disabled={subscribing}>
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  <AddIcon className="mr-2 h-4 w-4" />
                  Subscribe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metric Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMetric?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <p className="text-sm text-gray-600">
                {selectedMetric?.shared_description || selectedMetric?.description}
              </p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <h4 className="font-semibold text-sm">Details</h4>
              <dl className="text-sm space-y-1">
                <div>
                  <dt className="inline font-medium">Shared by:</dt>
                  <dd className="inline ml-2">{selectedMetric?.created_by_team_name || 'Organization'}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Type:</dt>
                  <dd className="inline ml-2">{selectedMetric?.type}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Value Type:</dt>
                  <dd className="inline ml-2">{selectedMetric?.value_type}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Goal:</dt>
                  <dd className="inline ml-2">
                    {getComparisonOperatorSymbol(selectedMetric?.comparison_operator)} {selectedMetric?.goal}
                  </dd>
                </div>
              </dl>
            </div>

            {selectedMetric?.data_source && (
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm">Data Source</h4>
                <p className="text-sm">{selectedMetric.data_source}</p>
              </div>
            )}

            {selectedMetric?.calculation_method && (
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm">Calculation Method</h4>
                <p className="text-sm">{selectedMetric.calculation_method}</p>
              </div>
            )}

            {selectedMetric?.update_frequency && (
              <div className="grid gap-2">
                <h4 className="font-semibold text-sm">Update Frequency</h4>
                <p className="text-sm">{selectedMetric.update_frequency}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Close
            </Button>
            {!selectedMetric?.is_subscribed && (
              <Button
                onClick={() => {
                  setDetailsDialog(false);
                  setSubscribeDialog(true);
                }}
              >
                <AddIcon className="mr-2 h-4 w-4" />
                Subscribe
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SharedMetricsBrowser;