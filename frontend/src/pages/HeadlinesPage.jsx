import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { headlinesService } from '../services/headlinesService';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import CascadingMessageDialog from '../components/cascadingMessages/CascadingMessageDialog';

const HeadlinesPage = () => {
  const { user } = useAuthStore();
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [showCascadingDialog, setShowCascadingDialog] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Get theme colors
  const orgId = user?.organizationId || user?.organization_id;
  const savedTheme = localStorage.getItem(`orgTheme_${orgId}`);
  const themeColors = savedTheme ? JSON.parse(savedTheme) : {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  };

  const handleCreateHeadline = async (headlineData) => {
    try {
      await headlinesService.createHeadline(headlineData);
      setSuccess('Headline created successfully!');
      setShowHeadlineDialog(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create headline');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCreateCascadingMessage = async (messageData) => {
    try {
      const teamId = user?.teams?.[0]?.id; // Default to first team
      await cascadingMessagesService.createCascadingMessage(
        orgId, 
        teamId, 
        messageData
      );
      setSuccess('Cascading message sent successfully!');
      setShowCascadingDialog(false);
      setTimeout(() => setSuccess(null), 3000);
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

        {/* Optional: Recent Headlines Section (can be added later) */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50">
            <p className="text-gray-500 text-center">
              Headlines and messages will appear here after creation
            </p>
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