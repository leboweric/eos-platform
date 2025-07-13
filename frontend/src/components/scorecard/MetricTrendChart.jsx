import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

const MetricTrendChart = ({ isOpen, onClose, metric, metricId, orgId, teamId }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && metricId) {
      fetchHistoricalData();
    }
  }, [isOpen, metricId]);

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
        for (let i = index - 2; i <= index; i++) {
          if (sorted[i].value !== null && sorted[i].value !== undefined) {
            movingTotal += parseFloat(sorted[i].value);
          }
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
    
    return dataWithMovingTotal;
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
        return `${value}%`;
      default:
        return Math.round(value).toString();
    }
  };

  const getTrendIcon = () => {
    if (chartData.length < 4) return <Minus className="h-5 w-5 text-gray-500" />;
    
    const recent = chartData.slice(-4);
    const recentAvg = recent.reduce((sum, d) => sum + (d.movingTotal || 0), 0) / recent.length;
    const older = chartData.slice(-8, -4);
    const olderAvg = older.reduce((sum, d) => sum + (d.movingTotal || 0), 0) / older.length;
    
    if (recentAvg > olderAvg * 1.05) {
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    } else if (recentAvg < olderAvg * 0.95) {
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
            {metric?.name} - 3-Week Moving Total Trend
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
                    stroke="#8b5cf6" 
                    name="Weekly Value"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    connectNulls={false}
                  />
                  
                  {/* 3-week moving total */}
                  <Line 
                    type="monotone" 
                    dataKey="movingTotal" 
                    stroke="#3b82f6" 
                    name="3-Week Moving Total"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    strokeDasharray="5 5"
                  />
                  
                  {/* Goal line (if applicable) */}
                  {metric?.goal && metric?.comparison_operator !== 'less_equal' && (
                    <ReferenceLine 
                      y={parseFloat(metric.goal) * 3} // 3-week goal
                      stroke="#10b981" 
                      strokeDasharray="3 3"
                      label="3-Week Goal"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>• The dashed line shows the 3-week moving total (sum of current week + 2 previous weeks)</p>
                <p>• The solid line shows individual weekly values</p>
                {metric?.goal && <p>• Green dashed line shows the 3-week goal target ({getValueFormatter(metric.goal * 3)})</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MetricTrendChart;