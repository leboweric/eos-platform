import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, Plus, Users, Users2, ArrowDownLeft, Edit2, Trash2, Check, X, Loader2, Archive, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDepartment } from '../contexts/DepartmentContext';
import { headlinesService } from '../services/headlinesService';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import HeadlineItem from '../components/headlines/HeadlineItem';
import CascadingMessageDialog from '../components/cascadingMessages/CascadingMessageDialog';
import { issuesService } from '../services/issuesService';
import { format } from 'date-fns';
import ConfirmationDialog, { useConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { toast } from 'sonner';

const HeadlinesPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [showCascadingDialog, setShowCascadingDialog] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [headlines, setHeadlines] = useState({ customer: [], employee: [] });
  const [cascadedMessages, setCascadedMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingHeadlineId, setEditingHeadlineId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deletingHeadlineId, setDeletingHeadlineId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [archivedHeadlines, setArchivedHeadlines] = useState({ customer: [], employee: [] });
  const [archivedMessages, setArchivedMessages] = useState([]);
  
  // Add ref to track archive execution
  const archiveInProgressRef = useRef(false);
  
  // Confirmation dialogs
  const archiveConfirmation = useConfirmationDialog();
  const deleteConfirmation = useConfirmationDialog();

  // Get theme colors
  const orgId = user?.organizationId || user?.organization_id;
  const savedTheme = localStorage.getItem(`orgTheme_${orgId}`);
  const themeColors = savedTheme ? JSON.parse(savedTheme) : {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  };

  // Fetch headlines and messages when component mounts or department changes
  useEffect(() => {
    if (selectedDepartment || user?.teams?.[0]) {
      fetchHeadlines();
      fetchCascadedMessages();
    }
  }, [selectedDepartment, user]);
  
  // Fetch archived items when switching to archived tab
  useEffect(() => {
    if (activeTab === 'archived' && (selectedDepartment || user?.teams?.[0])) {
      fetchArchivedItems();
    }
  }, [activeTab, selectedDepartment, user]);

  const fetchHeadlines = async () => {
    try {
      setLoading(true);
      // Clear existing headlines to provide visual feedback
      setHeadlines({ customer: [], employee: [] });
      
      const teamId = selectedDepartment?.id || user?.teams?.[0]?.id;
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
      // Clear existing messages to provide visual feedback
      setCascadedMessages([]);
      setSentMessages([]);
      
      const teamId = selectedDepartment?.id || user?.teams?.[0]?.id; // Use selected team or default to first team
      if (!teamId) return;
      
      const response = await cascadingMessagesService.getCascadingMessages(orgId, teamId);
      setCascadedMessages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch cascaded messages:', error);
    }
  };
  
  const fetchArchivedItems = async () => {
    try {
      const teamId = selectedDepartment?.id || user?.teams?.[0]?.id;
      if (!teamId) return;
      
      // Fetch archived headlines
      const headlinesResponse = await headlinesService.getHeadlines(teamId, true);
      const archived = headlinesResponse.data || [];
      setArchivedHeadlines({
        customer: archived.filter(h => h.type === 'customer'),
        employee: archived.filter(h => h.type === 'employee')
      });
      
      // Fetch archived cascading messages
      const messagesResponse = await cascadingMessagesService.getCascadingMessages(orgId, teamId, null, null, true);
      setArchivedMessages(messagesResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch archived items:', error);
      toast.error('Failed to load archived items');
    }
  };


  const handleCreateHeadline = async (headlineData) => {
    try {
      const teamId = selectedDepartment?.id || user?.teams?.[0]?.id;
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

  const handleArchiveHeadline = async (headline) => {
    archiveConfirmation.showConfirmation({
      type: 'archive',
      title: 'Archive Headline',
      message: `Are you sure you want to archive "${headline.text.length > 50 ? headline.text.substring(0, 50) + '...' : headline.text}"?`,
      actionLabel: 'Archive',
      onConfirm: async () => {
        // Guard against double execution
        if (archiveInProgressRef.current) {
          return;
        }
        
        archiveInProgressRef.current = true;
        
        try {
          setDeletingHeadlineId(headline.id);
          
          // 1. Archive the headline
          await headlinesService.archiveHeadline(headline.id);
          
          // 2. Close the modal FIRST (before fetchHeadlines to prevent flashing)
          archiveConfirmation.hideConfirmation();
          
          // 3. Show success message
          toast.success('Headline archived successfully!');
          
          // 4. Refresh headlines (happens in background, no flicker)
          await fetchHeadlines();
          
        } catch (err) {
          toast.error('Failed to archive headline');
          throw err; // Re-throw to keep dialog open on error
        } finally {
          setDeletingHeadlineId(null);
          archiveInProgressRef.current = false;
        }
      }
    });
  };

  const handleUpdateMessage = async (messageId) => {
    try {
      const teamId = selectedDepartment?.id || user?.teams?.[0]?.id;
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

  const handleDeleteMessage = async (messageId, messageText) => {
    deleteConfirmation.showConfirmation({
      type: 'delete',
      title: 'Delete Message',
      message: `Are you sure you want to delete \"${messageText?.length > 50 ? messageText.substring(0, 50) + '...' : messageText}\"?`,
      actionLabel: 'Delete',
      onConfirm: async () => {
        try {
          setDeletingMessageId(messageId);
          const teamId = selectedDepartment?.id || user?.teams?.[0]?.id;
          await cascadingMessagesService.deleteCascadingMessage(
            orgId,
            teamId,
            messageId
          );
          toast.success('Message deleted successfully!');
          fetchCascadedMessages();
        } catch (err) {
          toast.error('Failed to delete message');
          throw err; // Re-throw to keep dialog open on error
        } finally {
          setDeletingMessageId(null);
        }
      }
    });
  };

  const handleCreateCascadingMessage = async (messageData) => {
    try {
      const teamId = selectedDepartment?.id || user?.teams?.[0]?.id;
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

        {/* Headlines and Messages Display with Tabs */}
        <div className="mt-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 inline-flex shadow-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="border-0">
                <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
                  <TabsTrigger 
                    value="active" 
                    className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                    style={{
                      ...(activeTab === 'active' ? {
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      } : {})
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Active
                    <span className="ml-2 text-sm opacity-80">({headlines.customer.length + headlines.employee.length})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="archived" 
                    className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                    style={{
                      ...(activeTab === 'archived' ? {
                        background: `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.accent} 100%)`
                      } : {})
                    }}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archived
                    <span className="ml-2 text-sm opacity-80">({archivedHeadlines.customer.length + archivedHeadlines.employee.length})</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-0">
              <div className="space-y-8">
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
                  <HeadlineItem
                    key={headline.id}
                    headline={headline}
                    teamId={selectedDepartment?.id || user?.teams?.[0]?.id}
                    orgId={orgId}
                    onIssueCreated={fetchHeadlines}
                    themeColors={themeColors}
                    type="Customer"
                    showEditDelete={true}
                    onEdit={(headline) => {
                      setEditingHeadlineId(headline.id);
                      setEditingText(headline.text);
                    }}
                    onArchive={handleArchiveHeadline}
                    onUpdate={handleUpdateHeadline}
                    user={user}
                    isEditing={editingHeadlineId === headline.id}
                    editingText={editingText}
                    onStartEdit={(headline) => {
                      setEditingHeadlineId(headline.id);
                      setEditingText(headline.text);
                    }}
                    onSaveEdit={() => handleUpdateHeadline(headline.id)}
                    onCancelEdit={() => {
                      setEditingHeadlineId(null);
                      setEditingText('');
                    }}
                    onEditTextChange={setEditingText}
                  />
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
                  <HeadlineItem
                    key={headline.id}
                    headline={headline}
                    teamId={selectedDepartment?.id || user?.teams?.[0]?.id}
                    orgId={orgId}
                    onIssueCreated={fetchHeadlines}
                    themeColors={themeColors}
                    type="Employee"
                    showEditDelete={true}
                    onEdit={(headline) => {
                      setEditingHeadlineId(headline.id);
                      setEditingText(headline.text);
                    }}
                    onArchive={handleArchiveHeadline}
                    onUpdate={handleUpdateHeadline}
                    user={user}
                    isEditing={editingHeadlineId === headline.id}
                    editingText={editingText}
                    onStartEdit={(headline) => {
                      setEditingHeadlineId(headline.id);
                      setEditingText(headline.text);
                    }}
                    onSaveEdit={() => handleUpdateHeadline(headline.id)}
                    onCancelEdit={() => {
                      setEditingHeadlineId(null);
                      setEditingText('');
                    }}
                    onEditTextChange={setEditingText}
                  />
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
                        <div 
                          className="text-sm font-medium text-slate-900 leading-relaxed pr-20 cursor-pointer hover:bg-white/50 rounded px-2 py-1 -mx-2 -my-1 rich-text-display"
                          onClick={() => {
                            setEditingMessageId(message.id);
                            setEditingMessageText(message.message);
                          }}
                          title="Click to edit"
                          dangerouslySetInnerHTML={{ __html: message.message }}
                        />
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
                          onClick={() => handleDeleteMessage(message.id, message.text)}
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
            </TabsContent>

            <TabsContent value="archived" className="mt-0">
              <div className="space-y-8">
                {/* Archived Customer Headlines */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-600" />
                    Archived Customer Headlines ({archivedHeadlines.customer.length})
                  </h3>
                  {archivedHeadlines.customer.length > 0 ? (
                    <div className="space-y-3">
                      {archivedHeadlines.customer.map(headline => (
                        <HeadlineItem
                          key={headline.id}
                          headline={headline}
                          teamId={selectedDepartment?.id || user?.teams?.[0]?.id}
                          orgId={orgId}
                          onIssueCreated={fetchArchivedItems}
                          themeColors={themeColors}
                          type="Customer"
                          showEditDelete={false}
                          user={user}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No archived customer headlines</p>
                  )}
                </div>

                {/* Archived Employee Headlines */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-slate-600" />
                    Archived Employee Headlines ({archivedHeadlines.employee.length})
                  </h3>
                  {archivedHeadlines.employee.length > 0 ? (
                    <div className="space-y-3">
                      {archivedHeadlines.employee.map(headline => (
                        <HeadlineItem
                          key={headline.id}
                          headline={headline}
                          teamId={selectedDepartment?.id || user?.teams?.[0]?.id}
                          orgId={orgId}
                          onIssueCreated={fetchArchivedItems}
                          themeColors={themeColors}
                          type="Employee"
                          showEditDelete={false}
                          user={user}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No archived employee headlines</p>
                  )}
                </div>

                {/* Archived Cascading Messages */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-600" />
                    Archived Cascading Messages ({archivedMessages.length})
                  </h3>
                  {archivedMessages.length > 0 ? (
                    <div className="space-y-3">
                      {archivedMessages.map(message => (
                        <div key={message.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                          <div className="text-sm font-medium text-slate-900 leading-relaxed rich-text-display" dangerouslySetInnerHTML={{ __html: message.message }} />
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-slate-600">
                              From: {message.from_team_name || 'Unknown Team'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No archived cascading messages</p>
                  )}
                </div>
              </div>
            </TabsContent>
              </Tabs>
            </div>
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
      
      {/* Confirmation dialogs */}
      <archiveConfirmation.ConfirmationDialog />
      <deleteConfirmation.ConfirmationDialog />
    </div>
  );
};

export default HeadlinesPage;