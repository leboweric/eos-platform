import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info as InfoIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  DataUsage as DataUsageIcon
} from '@mui/icons-material';
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Search Bar */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search shared metrics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Metrics Grid */}
      {filteredMetrics.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No shared metrics available. Teams can share their metrics for others to use.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredMetrics.map(metric => (
            <Grid item xs={12} md={6} lg={4} key={metric.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                {metric.is_subscribed && (
                  <Chip
                    label="Subscribed"
                    color="success"
                    size="small"
                    icon={<CheckCircleIcon />}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {metric.name}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip
                      label={metric.created_by_team_name || 'Organization'}
                      size="small"
                      icon={<GroupsIcon />}
                      variant="outlined"
                    />
                    {metric.subscriber_count > 0 && (
                      <Chip
                        label={`${metric.subscriber_count} subscribers`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {metric.shared_description || metric.description}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Box display="flex" gap={2} mb={2}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Type:</strong> {metric.type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Value:</strong> {getValueTypeIcon(metric.value_type)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Goal:</strong> {getComparisonOperatorSymbol(metric.comparison_operator)} {metric.goal}
                    </Typography>
                  </Box>

                  {metric.data_source && (
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <DataUsageIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Source: {metric.data_source}
                      </Typography>
                    </Box>
                  )}

                  {metric.update_frequency && (
                    <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Updates: {metric.update_frequency}
                      </Typography>
                    </Box>
                  )}

                  <Box display="flex" gap={1}>
                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        onClick={() => setSelectedMetric(metric)}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    {!metric.is_subscribed && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setSelectedMetric(metric);
                          setSubscribeDialog(true);
                        }}
                        fullWidth
                      >
                        Subscribe
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialog} onClose={() => setSubscribeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Subscribe to: {selectedMetric?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                Subscribing to this metric will create a copy for your team to track. 
                You can set your own goal while keeping the same measurement method.
              </Typography>
            </Alert>

            <TextField
              label="Your Team's Goal (optional)"
              type="number"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              helperText={`Leave blank to use the default goal: ${selectedMetric?.goal}`}
              fullWidth
            />

            <TextField
              label="Notes (optional)"
              multiline
              rows={3}
              value={subscriptionNotes}
              onChange={(e) => setSubscriptionNotes(e.target.value)}
              helperText="Why is your team adopting this metric?"
              fullWidth
            />

            {selectedMetric?.calculation_method && (
              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="body2">
                  <strong>How it's calculated:</strong><br />
                  {selectedMetric.calculation_method}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscribeDialog(false)} disabled={subscribing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubscribe}
            variant="contained"
            disabled={subscribing}
            startIcon={subscribing ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {subscribing ? 'Subscribing...' : 'Subscribe'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Metric Details Dialog */}
      {selectedMetric && !subscribeDialog && (
        <Dialog open={true} onClose={() => setSelectedMetric(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedMetric.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1">
                {selectedMetric.shared_description || selectedMetric.description}
              </Typography>

              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom>Details</Typography>
                <Typography variant="body2">
                  <strong>Shared by:</strong> {selectedMetric.created_by_team_name || 'Organization'}
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {selectedMetric.type}
                </Typography>
                <Typography variant="body2">
                  <strong>Value Type:</strong> {selectedMetric.value_type}
                </Typography>
                <Typography variant="body2">
                  <strong>Goal:</strong> {getComparisonOperatorSymbol(selectedMetric.comparison_operator)} {selectedMetric.goal}
                </Typography>
              </Box>

              {selectedMetric.data_source && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Data Source</Typography>
                  <Typography variant="body2">{selectedMetric.data_source}</Typography>
                </Box>
              )}

              {selectedMetric.calculation_method && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Calculation Method</Typography>
                  <Typography variant="body2">{selectedMetric.calculation_method}</Typography>
                </Box>
              )}

              {selectedMetric.update_frequency && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Update Frequency</Typography>
                  <Typography variant="body2">{selectedMetric.update_frequency}</Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedMetric(null)}>Close</Button>
            {!selectedMetric.is_subscribed && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setSubscribeDialog(true)}
              >
                Subscribe
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SharedMetricsBrowser;