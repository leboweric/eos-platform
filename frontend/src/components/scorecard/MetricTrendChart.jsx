import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';

const MetricTrendChart = ({ isOpen, onClose, metric, metricId, orgId, teamId }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  useEffect(() => {
    if (isOpen && metricId) {
      fetchHistoricalData();
    }
  }, [isOpen, metricId]);

  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    const handleOrgChange = () => {
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id]);

  const fetchOrganizationTheme = async () => {
    try {
      const organizationId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(organizationId, theme);
      } else {
        const savedTheme = getOrgTheme(organizationId);
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const organizationId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(organizationId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };

  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      
      // Fetch historical data for the metric
      const response = await fetch(
        `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/metrics/${metricId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const data = await response.json();
      
      // Process data for chart
      const processedData = processChartData(data.data || data);
      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setError('Failed to load historical data');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];
    
    // Sort by date
    const sorted = rawData.sort((a, b) => new Date(a.week_date) - new Date(b.week_date));
    
    // Calculate 3-week moving totals
    const dataWithMovingTotal = sorted.map((item, index) => {
      let movingTotal = null;
      
      // Calculate 3-week moving total (current + 2 previous weeks)
      if (index >= 2) {
        movingTotal = 0;
        let count = 0;
        for (let i = index - 2; i <= index; i++) {
          if (sorted[i].value !== null && sorted[i].value !== undefined) {
            movingTotal += parseFloat(sorted[i].value);
            count++;
          }
        }
        // Use average for snapshot metrics (cash balance, utilization) or sum for cumulative metrics (sales, rainmaking)
        // aggregation_type can be 'average' or 'sum' (default)
        const shouldUseAverage = metric?.aggregation_type === 'average' || 
                                 (metric?.aggregation_type === undefined && metric?.value_type === 'percentage');
        if (shouldUseAverage && count > 0) {
          movingTotal = movingTotal / count;
        }
      }
      
      return {
        date: item.week_date,
        weekLabel: format(new Date(item.week_date), 'MMM d'),
        value: item.value ? parseFloat(item.value) : null,
        movingTotal: movingTotal,
        goal: metric?.goal ? parseFloat(metric.goal) : null
      };
    });
    
    // Calculate linear regression trendline for moving totals
    // Use only the last 13 weeks for trend calculation (quarterly trend)
    const last13Weeks = dataWithMovingTotal.slice(-13);
    const movingTotalPoints = last13Weeks
      .map((d, i) => ({ x: i, y: d.movingTotal }))
      .filter(p => p.y !== null);
    
    if (movingTotalPoints.length >= 2) {
      const { slope, intercept } = calculateLinearRegression(movingTotalPoints);
      
      // Add trendline values only to the last 13 weeks
      const startIndex = Math.max(0, dataWithMovingTotal.length - 13);
      dataWithMovingTotal.forEach((item, index) => {
        if (index >= startIndex && item.movingTotal !== null) {
          const relativeIndex = index - startIndex;
          item.trendline = slope * relativeIndex + intercept;
        }
      });
    }
    
    return dataWithMovingTotal;
  };
  
  // Calculate linear regression
  const calculateLinearRegression = (points) => {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const getValueFormatter = (value) => {
    if (value === null || value === undefined) return '-';
    
    switch (metric?.value_type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${Math.round(value)}%`;
      default:
        return Math.round(value).toString();
    }
  };

  const getTrendIcon = () => {
    if (chartData.length < 4) return <Minus className="h-5 w-5 text-gray-500" />;
    
    // Calculate slope from the trendline data
    const trendlinePoints = chartData.filter(d => d.trendline !== undefined);
    if (trendlinePoints.length < 2) return <Minus className="h-5 w-5 text-gray-500" />;
    
    const firstTrend = trendlinePoints[0].trendline;
    const lastTrend = trendlinePoints[trendlinePoints.length - 1].trendline;
    const changePercent = ((lastTrend - firstTrend) / firstTrend) * 100;
    
    if (changePercent > 5) {
      return <TrendingUp className="h-5 w-5" style={{ color: themeColors.primary }} />;
    } else if (changePercent < -5) {
      return <TrendingDown className="h-5 w-5 text-red-600" />;
    }
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'Goal') return [getValueFormatter(value), name];
    return [getValueFormatter(value), name];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {metric?.name} - 3-Week Moving {metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage') ? 'Average' : 'Total'} Trend
            {!loading && getTrendIcon()}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600 p-8">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            No historical data available
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="weekLabel" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tickFormatter={getValueFormatter}
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={(label) => `Week of ${label}`}
                  />
                  <Legend />
                  
                  {/* Weekly values */}
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={themeColors.secondary} 
                    name="Weekly Value"
                    strokeWidth={2}
                    dot={{ fill: themeColors.secondary, r: 4 }}
                    connectNulls={false}
                  />
                  
                  {/* 3-week moving total */}
                  <Line 
                    type="monotone" 
                    dataKey="movingTotal" 
                    stroke={themeColors.primary} 
                    name={`3-Week Moving ${metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage') ? 'Average' : 'Total'}`}
                    strokeWidth={3}
                    dot={{ fill: themeColors.primary, r: 5 }}
                    strokeDasharray="5 5"
                  />
                  
                  {/* Trendline for 3-week moving total */}
                  <Line 
                    type="monotone" 
                    dataKey="trendline" 
                    stroke={themeColors.accent} 
                    name="Trend"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="10 5"
                  />
                  
                  {/* Goal line (if applicable) */}
                  {metric?.goal && metric?.comparison_operator !== 'less_equal' && (
                    <ReferenceLine 
                      y={metric?.value_type === 'percentage' ? parseFloat(metric.goal) : parseFloat(metric.goal) * 3} // For percentages use goal as-is, for others multiply by 3
                      stroke="#10b981" 
                      strokeDasharray="3 3"
                      label={metric?.value_type === 'percentage' ? 'Goal' : '3-Week Goal'}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>• The dashed line shows the 3-week moving {metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage') ? 'average' : 'total'} ({metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage') ? 'average' : 'sum'} of current week + 2 previous weeks)</p>
                <p>• The dotted line shows the trend direction for the 3-week moving {metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage') ? 'average' : 'total'} (calculated using the last 13 weeks for quarterly trend analysis)</p>
                <p>• The solid line shows individual weekly values</p>
                {metric?.goal && <p>• Green dashed line shows the {metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage') ? 'goal' : '3-week goal'} target ({getValueFormatter((metric?.aggregation_type === 'average' || (metric?.aggregation_type === undefined && metric?.value_type === 'percentage')) ? metric.goal : metric.goal * 3)})</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MetricTrendChart;