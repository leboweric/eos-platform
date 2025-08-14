import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { Share as ShareIcon } from '@mui/icons-material';
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

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ShareIcon color="primary" />
          Share Metric: {metric.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Share this metric with other teams in your organization. They can subscribe to it and track their own goals.
          </Typography>

          <TextField
            label="Description for Other Teams"
            multiline
            rows={3}
            value={formData.shared_description}
            onChange={handleChange('shared_description')}
            helperText="Explain what this metric measures and how other teams should use it"
            required
            fullWidth
          />

          <TextField
            label="Data Source"
            value={formData.data_source}
            onChange={handleChange('data_source')}
            helperText="Where does the data for this metric come from? (e.g., CRM, Google Analytics)"
            fullWidth
          />

          <TextField
            label="Calculation Method"
            multiline
            rows={2}
            value={formData.calculation_method}
            onChange={handleChange('calculation_method')}
            helperText="How is this metric calculated? Include any formulas if applicable"
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Update Frequency</InputLabel>
            <Select
              value={formData.update_frequency}
              onChange={handleChange('update_frequency')}
              label="Update Frequency"
            >
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Current Settings:</strong>
              <br />
              Type: {metric.type}
              <br />
              Value Type: {metric.value_type}
              <br />
              Goal: {metric.goal}
              <br />
              Comparison: {metric.comparison_operator === 'greater_equal' ? '≥' : 
                          metric.comparison_operator === 'less_equal' ? '≤' : '='}
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <ShareIcon />}
        >
          {loading ? 'Sharing...' : 'Share Metric'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareMetricDialog;