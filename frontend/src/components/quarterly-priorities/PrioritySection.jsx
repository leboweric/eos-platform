import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Building2, Users } from 'lucide-react';
import PriorityCard from './PriorityCard';

const PrioritySection = ({
  title,
  icon: Icon,
  iconColor,
  priorities = [],
  isExpanded,
  onToggleExpanded,
  density,
  teamMembers,
  user,
  selectedDepartment,
  isArchived = false,
  onUpdate,
  onUpdateMilestone,
  onCreateMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onAddUpdate,
  onArchive,
  showOwnerInfo = false,
  ownerInfo = null
}) => {
  const getUserInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (priorities.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div 
        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
        onClick={onToggleExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-600 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
        )}
        
        <Icon className={`h-6 w-6 ${iconColor} flex-shrink-0`} />
        
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {showOwnerInfo && ownerInfo && (
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  {getUserInitials(ownerInfo.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{ownerInfo.name}</h3>
                {ownerInfo.role && ownerInfo.department && (
                  <p className="text-sm text-gray-600 truncate">
                    {ownerInfo.role} • {ownerInfo.department}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {!showOwnerInfo && (
            <h2 className="text-2xl font-bold truncate">{title}</h2>
          )}
        </div>
        
        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
          {priorities.length}
        </span>
      </div>

      {/* Section content */}
      {isExpanded && (
        <div className={`space-y-3 ${showOwnerInfo ? 'ml-11' : 'ml-7'} transition-all duration-200`}>
          {priorities.map(priority => (
            <PriorityCard
              key={priority.id}
              priority={priority}
              isCompany={priority.isCompanyPriority || priority.is_company_priority}
              isArchived={isArchived}
              density={density}
              teamMembers={teamMembers}
              user={user}
              selectedDepartment={selectedDepartment}
              onUpdate={onUpdate}
              onUpdateMilestone={onUpdateMilestone}
              onCreateMilestone={onCreateMilestone}
              onEditMilestone={onEditMilestone}
              onDeleteMilestone={onDeleteMilestone}
              onAddUpdate={onAddUpdate}
              onArchive={onArchive}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PrioritySection;