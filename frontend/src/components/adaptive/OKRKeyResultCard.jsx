/**
 * OKR Key Result Card Component
 * Shows graduated scoring (0.0 to 1.0) with confidence tracking
 * Patent Pending Serial No. 63/870,133
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  User, 
  Calendar,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OKRKeyResultCard({ objective, onUpdate, onCheckIn }) {
  const [currentValue, setCurrentValue] = useState(objective.current_value || 0);
  const [confidence, setConfidence] = useState(
    objective.framework_attributes?.confidence || 0.7
  );
  const [showChart, setShowChart] = useState(false);
  
  // Calculate OKR score (0.0 to 1.0)
  const startValue = objective.framework_attributes?.start_value || 0;
  const targetValue = objective.target_value || 100;
  const score = targetValue !== startValue 
    ? Math.max(0, Math.min(1, (currentValue - startValue) / (targetValue - startValue)))
    : 0;
  
  // OKR grading scale
  const getGrade = (score) => {
    if (score >= 0.7) return { grade: 'On Track', color: 'green', icon: CheckCircle };
    if (score >= 0.4) return { grade: 'Behind', color: 'yellow', icon: AlertTriangle };
    if (score > 0) return { grade: 'At Risk', color: 'red', icon: AlertTriangle };
    return { grade: 'Not Started', color: 'gray', icon: Minus };
  };
  
  const gradeInfo = getGrade(score);
  
  // Calculate trend
  const getTrend = () => {
    const progress = score;
    const timeElapsed = (Date.now() - new Date(objective.timeframe_start)) / 
                       (new Date(objective.timeframe_end) - new Date(objective.timeframe_start));
    
    if (progress > timeElapsed + 0.1) return { icon: TrendingUp, color: 'text-green-600', text: 'Ahead' };
    if (progress < timeElapsed - 0.1) return { icon: TrendingDown, color: 'text-red-600', text: 'Behind' };
    return { icon: Minus, color: 'text-gray-600', text: 'On Pace' };
  };
  
  const trend = getTrend();
  
  // Sample historical data for chart
  const historicalData = objective.framework_attributes?.check_ins || [
    { week: 'W1', score: 0.1, confidence: 0.9 },
    { week: 'W2', score: 0.2, confidence: 0.85 },
    { week: 'W3', score: 0.35, confidence: 0.8 },
    { week: 'W4', score: 0.45, confidence: 0.75 },
    { week: 'W5', score: score, confidence: confidence }
  ];
  
  const handleCheckIn = async () => {
    const checkInData = {
      date: new Date().toISOString(),
      current_value: currentValue,
      score: score,
      confidence: confidence,
      notes: ''
    };
    
    await onCheckIn(objective.id, checkInData);
  };
  
  const handleUpdateValue = async (newValue) => {
    setCurrentValue(newValue);
    await onUpdate({
      ...objective,
      current_value: newValue,
      framework_attributes: {
        ...objective.framework_attributes,
        confidence: confidence
      }
    });
  };
  
  // OKR color gradients based on score
  const getProgressColor = (score) => {
    if (score >= 0.7) return 'bg-gradient-to-r from-green-400 to-green-600';
    if (score >= 0.4) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (score > 0) return 'bg-gradient-to-r from-red-400 to-red-600';
    return 'bg-gray-300';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{objective.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Target: {targetValue} {objective.framework_attributes?.unit || 'units'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={`bg-${gradeInfo.color}-100 text-${gradeInfo.color}-800`}>
              <gradeInfo.icon className="h-3 w-3 mr-1" />
              {gradeInfo.grade}
            </Badge>
            <div className="flex items-center gap-1">
              <trend.icon className={`h-4 w-4 ${trend.color}`} />
              <span className={`text-xs ${trend.color}`}>{trend.text}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{objective.owner_name || 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Q{Math.ceil((new Date().getMonth() + 1) / 3)} Check-in</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OKR Score Display (0.0 to 1.0) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Score</span>
            <span className="text-2xl font-bold">{score.toFixed(2)}</span>
          </div>
          
          {/* Gradient progress bar - OKR signature visual */}
          <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(score)} flex items-center justify-end pr-2`}
              style={{ width: `${score * 100}%` }}
            >
              {score > 0.1 && (
                <span className="text-xs text-white font-semibold">
                  {Math.round(score * 100)}%
                </span>
              )}
            </div>
          </div>
          
          {/* Score breakdown */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium">{startValue}</div>
              <div className="text-gray-500">Start</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-600">{currentValue}</div>
              <div className="text-gray-500">Current</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{targetValue}</div>
              <div className="text-gray-500">Target</div>
            </div>
          </div>
        </div>
        
        {/* Confidence Slider - OKR specific */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Confidence Level</span>
            <span className="text-sm text-gray-600">{Math.round(confidence * 100)}%</span>
          </div>
          <Slider
            value={[confidence * 100]}
            onValueChange={(value) => setConfidence(value[0] / 100)}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
        
        {/* Update Current Value */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Update Progress</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
              className="flex-1"
              placeholder="Current value"
            />
            <Button 
              onClick={() => handleUpdateValue(currentValue)}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600"
            >
              Update
            </Button>
          </div>
        </div>
        
        {/* Progress Chart - OKR tracking */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChart(!showChart)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Progress History
            </span>
            <Activity className="h-4 w-4" />
          </Button>
          
          {showChart && (
            <div className="mt-3 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="#10b981" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* OKR Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCheckIn}
            className="flex-1"
          >
            Weekly Check-in
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            Add Note
          </Button>
        </div>
        
        {/* Update frequency indicator */}
        <div className="text-xs text-gray-500 text-center">
          Update frequency: {objective.framework_attributes?.update_frequency || 'Weekly'} • 
          Last updated: {new Date(objective.updated_at || Date.now()).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}