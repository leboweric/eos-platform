import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Plus, Users, Users2, ArrowDownLeft, AlertCircle, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTeam } from '../hooks/useTeam';
import { headlinesService } from '../services/headlinesService';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import CascadingMessageDialog from '../components/cascadingMessages/CascadingMessageDialog';
import { issuesService } from '../services/issuesService';
import { format } from 'date-fns';

const HeadlinesPage = () => {
  const { user } = useAuthStore();
  const { selectedTeamId, getSelectedTeam } = useTeam();
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [showCascadingDialog, setShowCascadingDialog] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [headlines, setHeadlines] = useState({ customer: [], employee: [] });
  const [cascadedMessages, setCascadedMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [creatingIssueFromHeadline, setCreatingIssueFromHeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingHeadlineId, setEditingHeadlineId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deletingHeadlineId, setDeletingHeadlineId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // Get theme colors
  const orgId = user?.organizationId || user?.organization_id;
  const savedTheme = localStorage.getItem(`orgTheme_${orgId}`);
  const themeColors = savedTheme ? JSON.parse(savedTheme) : {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  };

  // Fetch headlines and messages when component mounts or team changes
  useEffect(() => {
    if (selectedTeamId) {
      // Clear existing data and show loading state immediately
      setLoading(true);
      setHeadlines({ customer: [], employee: [] });
      setCascadedMessages([]);
      
      // Fetch new data
      fetchHeadlines();
      fetchCascadedMessages();
    }
  }, [selectedTeamId]);

  const fetchHeadlines = async () => {
    try {
      const teamId = selectedTeamId || user?.teams?.[0]?.id; // Use selected team or default to first team
      if (!teamId) {
        setLoading(false);
        return;
      }
      
      const response = await headlinesService.getHeadlines(teamId, false);
      
      const headlinesData = response.data || response || [];
      
      // Organize headlines by type
      const customerHeadlines = headlinesData.filter(h => h.type === 'customer');
      const employeeHeadlines = headlinesData.filter(h => h.type === 'employee');
      
      setHeadlines({
        customer: customerHeadlines,
        employee: employeeHeadlines
      });
    } catch (error) {
      console.error('Failed to fetch headlines:', error);
      setError('Failed to fetch headlines');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchCascadedMessages = async () => {
    try {
      const teamId = selectedTeamId || user?.teams?.[0]?.id; // Use selected team or default to first team
      if (!teamId) return;
      
      const response = await cascadingMessagesService.getCascadingMessages(orgId, teamId);
      setCascadedMessages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch cascaded messages:', error);
    }
  };

  // Function to create issue from headline
  const createIssueFromHeadline = async (headline, type) => {
    try {
      setCreatingIssueFromHeadline(headline.id);
      
      const teamId = selectedTeamId || user?.teams?.[0]?.id;
      
      const issueData = {
        title: `Issue from Headline: ${headline.text.substring(0, 100)}`,
        description: `This issue was created from a ${type} headline reported in the Weekly Meeting:\n\n**Headline:** ${headline.text}\n**Type:** ${type}\n**Reported by:** ${headline.createdBy || headline.created_by_name || 'Unknown'}\n**Date:** ${format(new Date(headline.created_at), 'MMM d, yyyy')}\n\n**Next steps:**\n- [ ] Investigate root cause\n- [ ] Determine action plan\n- [ ] Assign owner`,
        teamId: teamId,
        relatedHeadlineId: headline.id
      };

      await issuesService.createIssue(issueData);
      
      setSuccess(`Issue created from ${type} headline`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh headlines to update the has_related_issue flag
      fetchHeadlines();
    } catch (error) {
      console.error('Failed to create issue from headline:', error);
      setError('Failed to create issue from headline');
      setTimeout(() => setError(null), 3000);
    } finally {
      setCreatingIssueFromHeadline(null);
    }
  };

  const handleCreateHeadline = async (headlineData) => {
    try {
      const teamId = selectedTeamId || user?.teams?.[0]?.id;
      await headlinesService.createHeadline({
        ...headlineData,
        teamId
      });
      setSuccess('Headline created successfully!');
      setShowHeadlineDialog(false);
      setTimeout(() => setSuccess(null), 3000);
      // Refresh headlines to show the new one
      fetchHeadlines();
    } catch (err) {
      setError('Failed to create headline');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateHeadline = async (headlineId) => {
    try {
      await headlinesService.updateHeadline(headlineId, editingText);
      setSuccess('Headline updated successfully!');
      setEditingHeadlineId(null);
      setEditingText('');
      fetchHeadlines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update headline');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteHeadline = async (headlineId) => {
    if (!window.confirm('Are you sure you want to delete this headline?')) {
      return;
    }
    
    try {
      setDeletingHeadlineId(headlineId);
      await headlinesService.deleteHeadline(headlineId);
      setSuccess('Headline deleted successfully!');
      fetchHeadlines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete headline');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingHeadlineId(null);
    }
  };

  const handleUpdateMessage = async (messageId) => {
    try {
      const teamId = selectedTeamId || user?.teams?.[0]?.id;
      await cascadingMessagesService.updateCascadingMessage(
        orgId,
        teamId,
        messageId,
        editingMessageText
      );
      setSuccess('Message updated successfully!');
      setEditingMessageId(null);
      setEditingMessageText('');
      fetchCascadedMessages();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update message');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }
    
    try {
      setDeletingMessageId(messageId);
      const teamId = selectedTeamId || user?.teams?.[0]?.id;
      await cascadingMessagesService.deleteCascadingMessage(
        orgId,
        teamId,
        messageId
      );
      setSuccess('Message deleted successfully!');
      fetchCascadedMessages();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete message');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleCreateCascadingMessage = async (messageData) => {
    try {
      const teamId = selectedTeamId || user?.teams?.[0]?.id;
      await cascadingMessagesService.createCascadingMessage(
        orgId, 
        teamId, 
        messageData
      );
      setSuccess('Cascading message sent successfully!');
      setShowCascadingDialog(false);
      setTimeout(() => setSuccess(null), 3000);
      // Refresh messages to show the new one
      fetchCascadedMessages();
    } catch (err) {
      setError('Failed to send cascading message');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Headlines</h1>
          <p className="text-gray-600">Share news and announcements with your team</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Two Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Headline Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50 
                          hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Icon */}
              <div 
                className="p-4 rounded-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.primary}20, ${themeColors.accent}20)` 
                }}
              >
                <MessageSquare 
                  className="h-12 w-12" 
                  style={{ color: themeColors.primary }}
                />
              </div>
              
              {/* Title and Description */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Headline</h2>
                <p className="text-gray-600 text-sm">
                  Share good news, updates, or announcements with your team
                </p>
              </div>
              
              {/* Button */}
              <Button
                onClick={() => setShowHeadlineDialog(true)}
                className="w-full flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
                }}
              >
                <Plus className="h-5 w-5" />
                Create Headline
              </Button>
            </div>
          </div>

          {/* Create Cascading Message Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50 
                          hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Icon */}
              <div 
                className="p-4 rounded-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.secondary}20, ${themeColors.accent}20)` 
                }}
              >
                <Send 
                  className="h-12 w-12" 
                  style={{ color: themeColors.secondary }}
                />
              </div>
              
              {/* Title and Description */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Cascading Message</h2>
                <p className="text-gray-600 text-sm">
                  Send important messages that cascade to multiple teams
                </p>
              </div>
              
              {/* Button */}
              <Button
                onClick={() => setShowCascadingDialog(true)}
                className="w-full flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.secondary}, ${themeColors.primary})`,
                }}
              >
                <Send className="h-5 w-5" />
                Create Cascading Message
              </Button>
            </div>
          </div>
        </div>

        {/* Headlines and Messages Display */}
        <div className="mt-12 space-y-8">
          {/* Customer Headlines */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              Customer Headlines ({headlines.customer.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading headlines...</span>
              </div>
            ) : headlines.customer.length > 0 ? (
              <div className="space-y-3">
                {headlines.customer.map(headline => (
                  <div key={headline.id} className="group relative p-4 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow" 
                       style={{ borderLeftColor: themeColors.primary }}>
                    {editingHeadlineId === headline.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2"
                          style={{ focusBorderColor: themeColors.primary }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateHeadline(headline.id);
                            } else if (e.key === 'Escape') {
                              setEditingHeadlineId(null);
                              setEditingText('');
                            }
                          }}
                        />
                        <button
                          onClick={() => handleUpdateHeadline(headline.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingHeadlineId(null);
                            setEditingText('');
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p 
                          className="text-sm font-medium text-slate-900 leading-relaxed pr-20 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                          onClick={() => {
                            // Only allow editing if user created it or is admin
                            if (headline.created_by === user?.id || user?.role === 'admin') {
                              setEditingHeadlineId(headline.id);
                              setEditingText(headline.text);
                            }
                          }}
                          title={headline.created_by === user?.id || user?.role === 'admin' ? "Click to edit" : ""}
                        >
                          {headline.text}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span>{headline.createdBy || headline.created_by_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{format(new Date(headline.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Action buttons appear on hover */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit button - only show if user can edit */}
                      {(headline.created_by === user?.id || user?.role === 'admin') && editingHeadlineId !== headline.id && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                          onClick={() => {
                            setEditingHeadlineId(headline.id);
                            setEditingText(headline.text);
                          }}
                          title="Edit headline"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      )}
                      
                      {/* Create issue button */}
                      {!headline.has_related_issue && editingHeadlineId !== headline.id && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => createIssueFromHeadline(headline, 'Customer')}
                          disabled={creatingIssueFromHeadline === headline.id}
                          title="Create issue from headline"
                        >
                          {creatingIssueFromHeadline === headline.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-gray-600 animate-spin" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-gray-600" />
                          )}
                        </button>
                      )}
                      
                      {/* Delete button - only show if user can delete */}
                      {(headline.created_by === user?.id || user?.role === 'admin') && editingHeadlineId !== headline.id && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          onClick={() => handleDeleteHeadline(headline.id)}
                          disabled={deletingHeadlineId === headline.id}
                          title="Delete headline"
                        >
                          {deletingHeadlineId === headline.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No customer headlines yet</p>
            )}
          </div>

          {/* Employee Headlines */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users2 className="h-5 w-5 text-slate-600" />
              Employee Headlines ({headlines.employee.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : headlines.employee.length > 0 ? (
              <div className="space-y-3">
                {headlines.employee.map(headline => (
                  <div key={headline.id} className="group relative p-4 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow" 
                       style={{ borderLeftColor: themeColors.secondary }}>
                    {editingHeadlineId === headline.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2"
                          style={{ focusBorderColor: themeColors.secondary }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateHeadline(headline.id);
                            } else if (e.key === 'Escape') {
                              setEditingHeadlineId(null);
                              setEditingText('');
                            }
                          }}
                        />
                        <button
                          onClick={() => handleUpdateHeadline(headline.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingHeadlineId(null);
                            setEditingText('');
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p 
                          className="text-sm font-medium text-slate-900 leading-relaxed pr-20 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                          onClick={() => {
                            // Only allow editing if user created it or is admin
                            if (headline.created_by === user?.id || user?.role === 'admin') {
                              setEditingHeadlineId(headline.id);
                              setEditingText(headline.text);
                            }
                          }}
                          title={headline.created_by === user?.id || user?.role === 'admin' ? "Click to edit" : ""}
                        >
                          {headline.text}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span>{headline.createdBy || headline.created_by_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{format(new Date(headline.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Action buttons appear on hover */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit button - only show if user can edit */}
                      {(headline.created_by === user?.id || user?.role === 'admin') && editingHeadlineId !== headline.id && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                          onClick={() => {
                            setEditingHeadlineId(headline.id);
                            setEditingText(headline.text);
                          }}
                          title="Edit headline"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      )}
                      
                      {/* Create issue button */}
                      {!headline.has_related_issue && editingHeadlineId !== headline.id && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => createIssueFromHeadline(headline, 'Employee')}
                          disabled={creatingIssueFromHeadline === headline.id}
                          title="Create issue from headline"
                        >
                          {creatingIssueFromHeadline === headline.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-gray-600 animate-spin" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-gray-600" />
                          )}
                        </button>
                      )}
                      
                      {/* Delete button - only show if user can delete */}
                      {(headline.created_by === user?.id || user?.role === 'admin') && editingHeadlineId !== headline.id && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          onClick={() => handleDeleteHeadline(headline.id)}
                          disabled={deletingHeadlineId === headline.id}
                          title="Delete headline"
                        >
                          {deletingHeadlineId === headline.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No employee headlines yet</p>
            )}
          </div>

          {/* Cascading Messages */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <div className="p-1 rounded" style={{ backgroundColor: `${themeColors.primary}20` }}>
                <MessageSquare className="h-4 w-4" style={{ color: themeColors.primary }} />
              </div>
              Cascading Messages ({cascadedMessages.length})
            </h3>
            {cascadedMessages.length > 0 ? (
              <div className="space-y-3">
                {cascadedMessages.map(message => (
                  <div key={message.id} className="group relative p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                    {editingMessageId === message.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2"
                          style={{ focusBorderColor: themeColors.primary }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateMessage(message.id);
                            } else if (e.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditingMessageText('');
                            }
                          }}
                        />
                        <button
                          onClick={() => handleUpdateMessage(message.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingMessageText('');
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p 
                          className="text-sm font-medium text-slate-900 leading-relaxed pr-20 cursor-pointer hover:bg-white/50 rounded px-2 py-1 -mx-2 -my-1"
                          onClick={() => {
                            setEditingMessageId(message.id);
                            setEditingMessageText(message.message);
                          }}
                          title="Click to edit"
                        >
                          {message.message}
                        </p>
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                          <ArrowDownLeft className="h-3 w-3 text-blue-600" />
                          <span className="font-medium text-blue-900">{message.from_team_name || 'Unknown Team'}</span>
                          <span className="text-slate-400">•</span>
                          <span>{format(new Date(message.created_at), 'MMM d, h:mm a')}</span>
                        </p>
                      </>
                    )}
                    
                    {/* Action buttons appear on hover */}
                    {editingMessageId !== message.id && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                          onClick={() => {
                            setEditingMessageId(message.id);
                            setEditingMessageText(message.message);
                          }}
                          title="Edit message"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                        
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingMessageId === message.id}
                          title="Delete message"
                        >
                          {deletingMessageId === message.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No cascaded messages from other teams</p>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <HeadlineDialog
        open={showHeadlineDialog}
        onOpenChange={setShowHeadlineDialog}
        onSave={handleCreateHeadline}
      />

      {showCascadingDialog && (
        <CascadingMessageDialog
          open={showCascadingDialog}
          onOpenChange={setShowCascadingDialog}
          onSave={handleCreateCascadingMessage}
        />
      )}
    </div>
  );
};

export default HeadlinesPage;