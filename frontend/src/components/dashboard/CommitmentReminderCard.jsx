import React from 'react';
import { Target } from 'lucide-react';

const CommitmentReminderCard = ({ commitment }) => {
  if (!commitment) return null;

  // Use team color from the commitment, or fallback to default
  const themeColor = commitment.team_color || '#6366f1'; // fallback to indigo
  
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border-l-4 p-6 hover:shadow-md transition-shadow"
      style={{ borderLeftColor: themeColor }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ 
              backgroundColor: `${themeColor}15`, // 15% opacity
              color: themeColor 
            }}
          >
            <Target size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              My {commitment.year} Commitment
            </h3>
            {commitment.team_name && (
              <p className="text-sm text-gray-600">
                {commitment.team_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Commitment Text */}
      <blockquote className="relative">
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded"
          style={{ backgroundColor: themeColor }}
        />
        <p className="pl-4 text-lg text-gray-800 italic leading-relaxed">
          "{commitment.commitment_text}"
        </p>
      </blockquote>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <span>Set during Annual Planning</span>
        <span>•</span>
        <span>
          {new Date(commitment.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>
    </div>
  );
};

export default CommitmentReminderCard;