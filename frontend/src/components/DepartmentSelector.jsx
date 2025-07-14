import React from 'react';
import { useDepartment } from '../contexts/DepartmentContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Building2, Crown, AlertCircle } from 'lucide-react';

const DepartmentSelector = ({ className = '' }) => {
  const { 
    selectedDepartment, 
    availableDepartments, 
    isLeadershipMember,
    loading,
    changeDepartment 
  } = useDepartment();
  
  console.log('[DepartmentSelector] State:', {
    selectedDepartment,
    availableDepartments,
    isLeadershipMember,
    loading
  });
  
  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
      </div>
    );
  }
  
  if (!selectedDepartment || availableDepartments.length === 0) {
    console.warn('[DepartmentSelector] Not rendering because:', {
      selectedDepartment,
      availableDepartmentsLength: availableDepartments.length,
      availableDepartments
    });
    
    // Show a message in development mode
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`flex items-center gap-3 text-sm text-gray-500 ${className}`}>
          <AlertCircle className="h-4 w-4" />
          <span>No departments available</span>
        </div>
      );
    }
    
    return null;
  }
  
  // Don't show selector if user only has access to one department
  if (availableDepartments.length <= 1) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{selectedDepartment.name}</span>
          {isLeadershipMember && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Crown className="h-3 w-3 mr-1" />
              Leadership Access
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Building2 className="h-4 w-4" />
        <span className="font-medium">Department:</span>
      </div>
      
      <Select value={selectedDepartment.id} onValueChange={changeDepartment}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableDepartments.map(dept => (
            <SelectItem key={dept.id} value={dept.id}>
              <div className="flex items-center gap-2">
                {dept.is_leadership_team && <Crown className="h-3 w-3 text-blue-600" />}
                <span>{dept.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isLeadershipMember && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Crown className="h-3 w-3 mr-1" />
          Leadership Access
        </Badge>
      )}
    </div>
  );
};

export default DepartmentSelector;