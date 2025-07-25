import React from 'react';
import { useDepartment } from '../contexts/DepartmentContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Building2, Crown, AlertCircle } from 'lucide-react';

const DepartmentSelector = ({ className = '' }) => {
  console.log('[DepartmentSelector] Component rendering');
  
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
    console.log('[DepartmentSelector] Showing loading state');
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
        <span className="text-xs text-gray-500">Loading departments...</span>
      </div>
    );
  }
  
  if (!selectedDepartment || availableDepartments.length === 0) {
    console.warn('[DepartmentSelector] Not rendering because:', {
      selectedDepartment,
      availableDepartmentsLength: availableDepartments.length,
      availableDepartments
    });
    
    // Always show something so we know the component is rendering
    return (
      <div className={`flex items-center gap-3 text-sm ${className}`}>
        <AlertCircle className="h-4 w-4 text-orange-500" />
        <span className="text-orange-600 font-medium">No departments available (check console)</span>
      </div>
    );
  }
  
  // Don't show selector if user only has access to one department
  if (availableDepartments.length <= 1) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{selectedDepartment.name}</span>
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
      
    </div>
  );
};

export default DepartmentSelector;