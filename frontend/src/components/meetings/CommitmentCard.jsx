import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit2, Save, X, User } from 'lucide-react';

const CommitmentCard = ({ 
  member, 
  commitment, 
  onSave, 
  themeColors 
}) => {
  console.log('🔍 CommitmentCard received props:', {
    member: member.first_name + ' ' + member.last_name,
    commitment,
    hasCommitmentText: !!commitment?.commitment_text,
    commitmentText: commitment?.commitment_text
  });
  
  const [isEditing, setIsEditing] = useState(!commitment?.commitment_text);
  const [text, setText] = useState(commitment?.commitment_text || '');
  const [isSaving, setIsSaving] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  
  console.log('🔍 CommitmentCard state:', {
    isEditing,
    text,
    textLength: text.length
  });

  // Update text state when commitment prop changes (when data loads from API)
  useEffect(() => {
    if (commitment?.commitment_text && commitment.commitment_text !== text) {
      console.log('🔄 CommitmentCard updating text from prop:', commitment.commitment_text);
      setText(commitment.commitment_text);
      setIsEditing(false); // Stop editing if we now have saved text
    }
  }, [commitment?.commitment_text]);

  const handleSave = async () => {
    if (!text.trim()) return;
    
    const userId = member.user_id || member.id;
    console.log('🔍 CommitmentCard using userId:', userId, 'from member:', member);
    
    if (!userId) {
      console.error('❌ No user ID on member:', member);
      alert('Error: Cannot save - no user ID');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(userId, text);
      setIsEditing(false);
      setShouldAutoFocus(false);
    } catch (error) {
      console.error('Error saving commitment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setText(commitment?.commitment_text || '');
    setIsEditing(false);
    setShouldAutoFocus(false);
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl shadow-lg">
      <CardContent className="p-6">
        {/* Member Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: themeColors.primary }}
          >
            <User className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">
              {member.first_name} {member.last_name}
            </h4>
            <p className="text-sm text-slate-600">{member.email}</p>
          </div>
        </div>

        {/* Commitment Section */}
        <div className="space-y-3">
          <p className="font-medium text-slate-700">
            In {new Date().getFullYear() + 1} I commit to:
          </p>

          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start or stop doing something specific..."
                className="min-h-[100px] resize-none"
                autoFocus={shouldAutoFocus}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {text.length} characters
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!text.trim() || isSaving}
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-lg border-l-4" style={{ borderLeftColor: themeColors.primary }}>
                <p className="text-slate-700 whitespace-pre-wrap">{text}</p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setShouldAutoFocus(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommitmentCard;