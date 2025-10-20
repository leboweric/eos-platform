import React from 'react';
import { Users, AlertTriangle, CheckCircle } from 'lucide-react';

const OwnerMappingSection = ({ 
  unmappedAssignees, 
  availableUsers, 
  mappings, 
  onMappingChange 
}) => {
  const handleMappingChange = (assigneeName, userId) => {
    const newMappings = { ...mappings };
    if (userId) {
      newMappings[assigneeName] = userId;
    } else {
      delete newMappings[assigneeName];
    }
    onMappingChange(newMappings);
  };

  const getMappedCount = () => {
    return unmappedAssignees.filter(name => mappings[name]).length;
  };

  if (!unmappedAssignees || unmappedAssignees.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <h3 className="font-medium text-green-800">All Assignees Mapped</h3>
            <p className="text-green-700 text-sm">
              All assignees in your CSV have been automatically matched to users in your organization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-4">
        <Users className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-orange-800">Map Assignees to Users</h3>
          <p className="text-orange-700 text-sm mt-1">
            {unmappedAssignees.length} assignee{unmappedAssignees.length !== 1 ? 's' : ''} from your CSV 
            could not be automatically matched. Please map them to users in your organization.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-sm text-orange-600">
              Progress: {getMappedCount()}/{unmappedAssignees.length} mapped
            </div>
            <div className="flex-1 bg-orange-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getMappedCount() / unmappedAssignees.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {unmappedAssignees.map((assigneeName, index) => (
          <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{assigneeName}</div>
                <div className="text-sm text-gray-500">From CSV file</div>
              </div>
              
              <div className="flex-1 max-w-xs">
                <select
                  value={mappings[assigneeName] || ''}
                  onChange={(e) => handleMappingChange(assigneeName, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                {mappings[assigneeName] ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <strong>Note:</strong> Unmapped assignees will have their names stored as text in the priority records. 
            You can edit these assignments later in the priorities page.
          </div>
        </div>
      </div>

      {getMappedCount() === unmappedAssignees.length && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">
              All assignees have been mapped successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerMappingSection;