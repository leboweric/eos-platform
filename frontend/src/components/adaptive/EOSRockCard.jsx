/**
 * EOS Rock Card Component
 * Shows binary completion (Done/Not Done) with milestones
 * Patent Pending Serial No. 63/870,133
 */

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  User, 
  Calendar,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function EOSRockCard({ objective, onUpdate, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [milestones, setMilestones] = useState(
    objective.framework_attributes?.milestones || []
  );

  // Calculate progress based on milestones
  const completedMilestones = milestones.filter(m => m.completed).length;
  const totalMilestones = milestones.length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  // EOS-specific status determination
  const getStatus = () => {
    if (objective.status === 'completed') return 'DONE';
    if (progress < 30) return 'OFF TRACK';
    return 'ON TRACK';
  };

  const status = getStatus();
  
  // EOS color scheme
  const statusColors = {
    'DONE': 'bg-blue-500',
    'ON TRACK': 'bg-green-500',
    'OFF TRACK': 'bg-red-500'
  };

  const handleMilestoneToggle = async (milestoneId) => {
    const updatedMilestones = milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    setMilestones(updatedMilestones);
    
    // Update the objective with new milestone status
    await onUpdate({
      ...objective,
      framework_attributes: {
        ...objective.framework_attributes,
        milestones: updatedMilestones
      }
    });
  };

  const handleMarkComplete = async () => {
    await onComplete(objective.id);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4"
          style={{ borderLeftColor: statusColors[status].replace('bg-', '#').replace('500', '600') }}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{objective.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
          </div>
          <Badge className={`${statusColors[status]} text-white ml-3`}>
            {status}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{objective.owner_name || 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Q{objective.quarter || '1'} {objective.year || new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span>{completedMilestones}/{totalMilestones} Milestones</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* EOS Binary Progress - either working on it or done */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Rock Progress</span>
            <span className="text-sm text-gray-600">
              {status === 'DONE' ? '100%' : `${Math.round(progress)}%`}
            </span>
          </div>
          
          {/* EOS doesn't use gradual progress bars - it's binary */}
          <div className="flex items-center gap-3">
            {status === 'DONE' ? (
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            ) : (
              <Circle className="h-8 w-8 text-gray-400" />
            )}
            <div className="flex-1">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    status === 'DONE' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                  style={{ width: status === 'DONE' ? '100%' : '0%' }}
                />
              </div>
            </div>
          </div>
          
          {/* Milestones - EOS tracking method */}
          {totalMilestones > 0 && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full justify-between"
              >
                <span className="text-sm font-medium">Milestones</span>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {expanded && (
                <div className="mt-2 space-y-2 pl-2">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-2">
                      <Checkbox
                        checked={milestone.completed}
                        onCheckedChange={() => handleMilestoneToggle(milestone.id)}
                        className="mt-0.5"
                      />
                      <label 
                        className={`text-sm flex-1 cursor-pointer ${
                          milestone.completed ? 'line-through text-gray-500' : ''
                        }`}
                        onClick={() => handleMilestoneToggle(milestone.id)}
                      >
                        {milestone.title}
                        {milestone.due_date && (
                          <span className="text-xs text-gray-500 ml-2">
                            Due: {new Date(milestone.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* EOS Action Buttons */}
          <div className="flex gap-2 mt-4">
            {status !== 'DONE' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onUpdate({ ...objective, framework_attributes: { ...objective.framework_attributes, status: 'off-track' }})}
                  className="text-red-600 hover:bg-red-50"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Mark Off Track
                </Button>
                <Button 
                  size="sm"
                  onClick={handleMarkComplete}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              </>
            )}
            {status === 'DONE' && (
              <Badge className="bg-blue-100 text-blue-700">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Rock Completed
              </Badge>
            )}
          </div>
        </div>
        
        {/* EOS Accountability Chart Integration */}
        {objective.framework_attributes?.accountability_chart_role && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-xs text-gray-500">
              Accountability Chart Role: {objective.framework_attributes.accountability_chart_role}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}