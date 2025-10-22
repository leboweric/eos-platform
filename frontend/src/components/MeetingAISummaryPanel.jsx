import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  MessageSquare,
  Target,
  ListTodo,
  Download,
  Loader2,
  X
} from 'lucide-react';
import aiMeetingService from '../services/aiMeetingService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

export const MeetingAISummaryPanel = ({ meetingId, organizationId, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [summaryStatus, setSummaryStatus] = useState('processing'); // processing, completed, failed

  useEffect(() => {
    pollForSummary();
  }, [meetingId, organizationId]);

  const pollForSummary = async () => {
    const maxAttempts = 40; // 40 attempts x 3 seconds = 2 minutes
    
    setLoading(true);
    setSummaryStatus('processing');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        console.log(`🔍 Polling for AI summary completion (attempt ${i + 1}/${maxAttempts})`);
        
        // First check transcript status
        const statusResponse = await aiMeetingService.getTranscriptionStatus(meetingId);
        console.log('📊 Transcript status:', statusResponse);
        
        if (statusResponse.status === 'completed') {
          // AI processing is complete, load the summary
          console.log('✅ AI processing complete, loading summary...');
          await loadCompletedSummary();
          return;
        }
        
        if (statusResponse.status === 'failed') {
          console.log('❌ AI processing failed');
          setSummaryStatus('failed');
          setError('AI summary generation failed');
          setLoading(false);
          return;
        }
        
        // Still processing, wait and try again
        console.log('⏳ Still processing, waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling on error unless it's the last attempt
        if (i === maxAttempts - 1) {
          setSummaryStatus('failed');
          setError('Failed to load AI summary after timeout');
          setLoading(false);
          return;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Timeout after 2 minutes
    console.log('⏰ Polling timeout reached');
    setSummaryStatus('failed');
    setError('AI summary generation timed out');
    setLoading(false);
  };

  const loadCompletedSummary = async () => {
    try {
      const [summaryData, transcriptData] = await Promise.all([
        aiMeetingService.getAISummary(meetingId),
        aiMeetingService.getTranscript(meetingId)
      ]);

      setSummary(summaryData);
      setTranscript(transcriptData);
      setSummaryStatus('completed');
      setError(null);
    } catch (err) {
      console.error('Error loading completed AI summary:', err);
      setSummaryStatus('failed');
      setError('Failed to load completed AI summary');
    } finally {
      setLoading(false);
    }
  };

  const loadSummaryAndTranscript = async () => {
    // Legacy function for retry button - restart polling
    await pollForSummary();
  };

  const handleCreateTodos = async (actionItemIds = []) => {
    try {
      setCreating(true);
      const result = await aiMeetingService.createTodosFromAI(meetingId, actionItemIds);
      
      // Refresh summary to show updated status
      await loadSummaryAndTranscript();
      
      toast.success(`${result.todos_created} todos created successfully!`);
    } catch (err) {
      console.error('Error creating todos:', err);
      toast.error('Failed to create todos');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateIssues = async (issueIds = []) => {
    try {
      setCreating(true);
      const result = await aiMeetingService.createIssuesFromAI(meetingId, issueIds);
      
      await loadSummaryAndTranscript();
      toast.success(`${result.issues_created} issues created successfully!`);
    } catch (err) {
      console.error('Error creating issues:', err);
      toast.error('Failed to create issues');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadTranscript = async (format = 'txt') => {
    try {
      await aiMeetingService.downloadTranscript(meetingId, format);
      toast.success('Transcript downloaded successfully!');
    } catch (err) {
      console.error('Error downloading transcript:', err);
      toast.error('Failed to download transcript');
    }
  };

  if (loading && summaryStatus === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <span className="text-lg font-medium text-gray-700">Processing transcript & generating AI summary...</span>
        <span className="text-sm text-gray-500 mt-2">This may take 15-30 seconds</span>
        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>🎤 Transcription complete</p>
          <p>🤖 AI analysis in progress...</p>
        </div>
      </div>
    );
  }

  if (summaryStatus === 'failed' || error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{error || 'AI summary generation failed'}</p>
        <p className="text-sm text-gray-500 mt-2">The transcription was successful, but AI analysis encountered an issue.</p>
        <Button onClick={loadSummaryAndTranscript} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600">No AI summary available</p>
        <Button onClick={loadSummaryAndTranscript} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="meeting-ai-summary-panel bg-gray-50 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <div>
              <h2 className="text-2xl font-bold">AI Meeting Summary</h2>
              <p className="text-blue-100 text-sm">Powered by GPT-4 & AssemblyAI</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-white hover:bg-white/20"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Meeting Insights */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-sm text-blue-100">Sentiment</div>
            <div className="text-xl font-bold capitalize">
              {summary.meeting_sentiment || 'N/A'}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-sm text-blue-100">Energy Score</div>
            <div className="text-xl font-bold">
              {summary.meeting_energy_score || 'N/A'}/10
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-sm text-blue-100">Focus Score</div>
            <div className="text-xl font-bold">
              {summary.meeting_focus_score || 'N/A'}/10
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="summary" className="p-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">
            <Sparkles className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="actions">
            <ListTodo className="h-4 w-4 mr-2" />
            Actions ({summary.action_items?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="issues">
            <AlertCircle className="h-4 w-4 mr-2" />
            Issues ({summary.issues_discussed?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="transcript">
            <MessageSquare className="h-4 w-4 mr-2" />
            Transcript
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                {summary.executive_summary}
              </p>
            </CardContent>
          </Card>

          {summary.key_decisions && summary.key_decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Key Decisions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.key_decisions.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-gray-700">{decision}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {summary.next_steps && summary.next_steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">→</span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {summary.rocks_mentioned && summary.rocks_mentioned.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Rocks/Priorities Discussed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.rocks_mentioned.map((rock, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{rock.rock_title}</div>
                        {rock.update && (
                          <div className="text-sm text-gray-600 mt-1">{rock.update}</div>
                        )}
                      </div>
                      <Badge 
                        variant={
                          rock.status === 'on_track' ? 'default' :
                          rock.status === 'off_track' ? 'destructive' :
                          rock.status === 'completed' ? 'default' : 'secondary'
                        }
                        className={
                          rock.status === 'on_track' ? 'bg-green-100 text-green-800' :
                          rock.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''
                        }
                      >
                        {rock.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {summary.discussion_topics && summary.discussion_topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Discussion Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.discussion_topics.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{topic.topic}</div>
                        <div className="text-sm text-gray-600">
                          {topic.duration_minutes} minutes • {topic.sentiment} sentiment
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Action Items</CardTitle>
                  <CardDescription>
                    AI-extracted tasks from the meeting
                  </CardDescription>
                </div>
                {summary.action_items && summary.action_items.length > 0 && (
                  <Button 
                    onClick={() => handleCreateTodos()}
                    disabled={creating}
                    className="flex items-center gap-2"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create All as Todos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {summary.action_items && summary.action_items.length > 0 ? (
                <div className="space-y-3">
                  {summary.action_items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {item.task}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {item.assignee && (
                              <div>👤 {item.assignee}</div>
                            )}
                            {item.due_date && (
                              <div>📅 Due: {new Date(item.due_date).toLocaleDateString()}</div>
                            )}
                            {item.context && (
                              <div className="text-xs italic">"{item.context}"</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant={
                              item.confidence === 'high' ? 'default' :
                              item.confidence === 'medium' ? 'secondary' : 'outline'
                            }
                            className={
                              item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                              item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''
                            }
                          >
                            {item.confidence}
                          </Badge>
                          {item.created_as_todo ? (
                            <Badge variant="outline" className="text-green-600">
                              ✓ Created
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateTodos([item.id])}
                              disabled={creating}
                            >
                              Create Todo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No action items detected in this meeting
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Issues Discussed</CardTitle>
                  <CardDescription>
                    Problems and challenges identified during the meeting
                  </CardDescription>
                </div>
                {summary.issues_discussed && summary.issues_discussed.length > 0 && (
                  <Button 
                    onClick={() => handleCreateIssues()}
                    disabled={creating}
                    variant="outline"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Unsolved as Issues
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {summary.issues_discussed && summary.issues_discussed.length > 0 ? (
                <div className="space-y-3">
                  {summary.issues_discussed.map((issue, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 border rounded-lg ${
                        issue.status === 'solved' 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant={issue.status === 'solved' ? 'default' : 'secondary'}
                              className={
                                issue.status === 'solved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }
                            >
                              {issue.status}
                            </Badge>
                            {issue.time_spent_minutes && (
                              <span className="text-xs text-gray-600">
                                {issue.time_spent_minutes} min
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-gray-900 mb-1">
                            {issue.issue}
                          </div>
                          {issue.solution && (
                            <div className="text-sm text-green-700 mt-2">
                              ✓ Solution: {issue.solution}
                            </div>
                          )}
                        </div>
                        {issue.status !== 'solved' && !issue.created_as_issue && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateIssues([issue.id])}
                            disabled={creating}
                          >
                            Create Issue
                          </Button>
                        )}
                        {issue.created_as_issue && (
                          <Badge variant="outline" className="text-green-600">
                            ✓ Created
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No issues detected in this meeting
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meeting Transcript</CardTitle>
                  <CardDescription>
                    Full transcript with speaker identification
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleDownloadTranscript('txt')}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download TXT
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleDownloadTranscript('json')}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transcript?.structured_transcript && transcript.structured_transcript.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transcript.structured_transcript.map((segment, idx) => (
                    <div key={idx} className="flex gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className="text-xs text-gray-500 w-16 flex-shrink-0">
                        {segment.timestamp}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-700">
                          {segment.speaker}:
                        </div>
                        <div className="text-gray-900">
                          {segment.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : transcript?.raw_transcript ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700">
                    {transcript.raw_transcript}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No transcript available
                </p>
              )}

              {transcript && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                  <div className="flex gap-4">
                    <span>Duration: {Math.floor((transcript.duration_seconds || 0) / 60)} min</span>
                    <span>Words: {transcript.word_count?.toLocaleString() || 'N/A'}</span>
                    <span>Service: {transcript.transcription_service || 'AssemblyAI'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};