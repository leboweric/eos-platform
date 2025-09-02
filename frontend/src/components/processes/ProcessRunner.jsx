import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Eye,
  X,
  ChevronDown,
  ChevronRight,
  Info,
  Paperclip,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import axios from '../../services/axiosConfig';

const ProcessRunner = ({ process, onClose, themeColors }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [completedSubSteps, setCompletedSubSteps] = useState(new Set());
  const [expandedSteps, setExpandedSteps] = useState(new Set([0])); // First step expanded by default
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If process already has steps, use them
    if (process.steps && process.steps.length > 0) {
      setSteps(process.steps);
      setLoading(false);
      setStartTime(Date.now());
    } else {
      // Otherwise fetch the full process details
      fetchProcessDetails();
    }
  }, [process.id]);

  useEffect(() => {
    // Timer for elapsed time
    if (!isPaused && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, isPaused]);

  const fetchProcessDetails = async () => {
    try {
      const response = await axios.get(`/processes/${process.id}`);
      const processData = response.data;
      setSteps(processData.steps || []);
      setLoading(false);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to fetch process details:', error);
      setLoading(false);
    }
  };

  const handleStepComplete = (stepIndex) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
      // Also uncomplete all substeps
      steps[stepIndex]?.bullets?.forEach((_, subIndex) => {
        const subKey = `${stepIndex}-${subIndex}`;
        completedSubSteps.delete(subKey);
      });
      setCompletedSubSteps(new Set(completedSubSteps));
    } else {
      newCompleted.add(stepIndex);
      // Auto-complete all substeps
      steps[stepIndex]?.bullets?.forEach((_, subIndex) => {
        const subKey = `${stepIndex}-${subIndex}`;
        completedSubSteps.add(subKey);
      });
      setCompletedSubSteps(new Set(completedSubSteps));
    }
    setCompletedSteps(newCompleted);
    
    // Auto-advance to next step if current step is completed
    if (!newCompleted.has(stepIndex) === false && stepIndex === currentStepIndex && stepIndex < steps.length - 1) {
      setCurrentStepIndex(stepIndex + 1);
      setExpandedSteps(new Set([stepIndex + 1]));
    }
  };

  const handleSubStepComplete = (stepIndex, subIndex) => {
    const subKey = `${stepIndex}-${subIndex}`;
    const newCompleted = new Set(completedSubSteps);
    if (newCompleted.has(subKey)) {
      newCompleted.delete(subKey);
    } else {
      newCompleted.add(subKey);
    }
    setCompletedSubSteps(newCompleted);
    
    // Check if all substeps are completed to complete the parent step
    const allSubStepsCompleted = steps[stepIndex]?.bullets?.every((_, idx) => 
      newCompleted.has(`${stepIndex}-${idx}`)
    );
    
    if (allSubStepsCompleted && !completedSteps.has(stepIndex)) {
      handleStepComplete(stepIndex);
    }
  };

  const toggleStepExpanded = (stepIndex) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle attachment preview
  const handlePreviewAttachment = (attachment) => {
    // Check if it's an image
    const isImage = attachment.isImage || 
                   attachment.fileType?.startsWith('image/') || 
                   attachment.file_type?.startsWith('image/') ||
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || attachment.fileName || attachment.file_name || '');
    
    if (isImage) {
      // Get the image URL
      let imageUrl = attachment.url || attachment.file_url || attachment.file_data || attachment.fileData || attachment.data;
      
      // If it's base64 data without the data URL prefix, add it
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        const mimeType = attachment.fileType || attachment.file_type || 'image/jpeg';
        imageUrl = `data:${mimeType};base64,${imageUrl}`;
      }
      
      if (!imageUrl) {
        alert('Unable to preview this image.');
        return;
      }
      
      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${attachment.name || attachment.fileName || attachment.file_name || 'Image Preview'}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1f2937; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${imageUrl}" alt="Preview" />
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } else {
      // For non-images, download
      handleDownloadAttachment(attachment);
    }
  };

  // Handle attachment download
  const handleDownloadAttachment = (attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url || attachment.file_url || attachment.file_data || attachment.fileData || '';
    link.download = attachment.name || attachment.fileName || attachment.file_name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = completedSteps.size;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const renderFormattedText = (text) => {
    if (!text) return '';
    
    // Preserve formatting with proper indentation and bullet alignment
    return (
      <pre className="font-sans text-xs text-slate-600 whitespace-pre-wrap break-words pl-0 m-0">
        {text}
      </pre>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: themeColors.primary }} />
          <p className="text-slate-600">Loading process...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Exit
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{process.name}</h1>
                <p className="text-sm text-slate-600">{process.category}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </Button>
              </div>
              
              {/* Progress */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  {completedCount} of {totalSteps} steps
                </span>
                <div className="w-32">
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Process Description */}
        {process.description && (
          <Card className="bg-white/80 backdrop-blur-sm border-white/50 mb-6">
            <CardHeader>
              <CardTitle className="text-base">Process Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-slate-600 font-sans whitespace-pre-wrap break-words">
                {process.description}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Steps List */}
        {steps.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-white/50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Steps Found</h3>
                <p className="text-sm text-slate-600 mb-4">
                  This process doesn't have any steps defined yet.
                </p>
                <Button onClick={onClose} variant="outline">
                  Return to Processes
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="space-y-4">
          {steps.map((step, stepIndex) => {
            const isCompleted = completedSteps.has(stepIndex);
            const isExpanded = expandedSteps.has(stepIndex);
            const isCurrent = stepIndex === currentStepIndex;
            
            return (
              <Card 
                key={stepIndex}
                className={`bg-white/80 backdrop-blur-sm border transition-all ${
                  isCurrent ? 'border-blue-300 shadow-lg' : 'border-white/50'
                } ${isCompleted ? 'opacity-75' : ''}`}
              >
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleStepExpanded(stepIndex)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Step Number Circle */}
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isCurrent
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="h-5 w-5" /> : stepIndex + 1}
                      </div>
                      
                      {/* Step Title and Description */}
                      <div className="flex-1">
                        <CardTitle className={`text-lg ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {step.title || `Step ${stepIndex + 1}`}
                        </CardTitle>
                        {step.description && isExpanded && (
                          <pre className="mt-2 text-sm text-slate-600 font-sans whitespace-pre-wrap break-words">
                            {step.description}
                          </pre>
                        )}
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleStepComplete(stepIndex)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStepExpanded(stepIndex);
                        }}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    {/* Sub-steps */}
                    {step.bullets && step.bullets.length > 0 && (
                      <div className="space-y-3 mb-4 ml-11">
                        {step.bullets.map((subStep, subIndex) => {
                          const subKey = `${stepIndex}-${subIndex}`;
                          const isSubCompleted = completedSubSteps.has(subKey);
                          const subStepLetter = String.fromCharCode(97 + subIndex);
                          
                          return (
                            <div key={subIndex} className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-medium transition-all ${
                                isSubCompleted 
                                  ? 'bg-green-100 border-green-300 text-green-700' 
                                  : 'bg-white border-slate-300 text-slate-600'
                              }`}>
                                {isSubCompleted ? '✓' : subStepLetter}
                              </div>
                              <Checkbox
                                checked={isSubCompleted}
                                onCheckedChange={() => handleSubStepComplete(stepIndex, subIndex)}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1">
                                <p className={`text-sm ${isSubCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {subStep.text}
                                </p>
                                {subStep.notes && (
                                  <div className="mt-2 bg-slate-50 rounded-lg" style={{ padding: '12px 12px 12px 16px' }}>
                                    {renderFormattedText(subStep.notes)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {step.attachments && step.attachments.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Paperclip className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-600">Attachments</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {step.attachments.map((attachment, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                              <FileText className="h-4 w-4 text-slate-400" />
                              <span className="text-xs text-slate-600 flex-1 truncate">
                                {attachment.fileName || attachment.file_name || 'Attachment'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handlePreviewAttachment(attachment)}
                                title="Preview"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        )}

        {/* Completion Message */}
        {completedCount === totalSteps && totalSteps > 0 && (
          <Card className="bg-green-50 border-green-200 mt-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">Process Complete!</h3>
                <p className="text-sm text-green-600 mb-4">
                  You've successfully completed all {totalSteps} steps in {formatTime(elapsedTime)}.
                </p>
                <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                  Finish
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProcessRunner;