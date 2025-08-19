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
        <div className="animate-pulse bg-slate-200/50 h-10 w-48 rounded-xl"></div>
        <span className="text-xs text-slate-500 font-medium">Loading departments...</span>
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
        <span className="text-orange-600 font-semibold">No departments available (check console)</span>
      </div>
    );
  }
  
  // Don't show selector if user only has access to one department
  if (availableDepartments.length <= 1) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl shadow-sm">
          <Building2 className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">{selectedDepartment.name}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-slate-700 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-xl">
        <Building2 className="h-4 w-4 text-slate-600" />
        <span className="font-semibold">Department:</span>
      </div>
      
      <Select value={selectedDepartment.id} onValueChange={changeDepartment}>
        <SelectTrigger className="w-[200px] bg-white/80 backdrop-blur-sm border-white/50 rounded-xl shadow-sm hover:bg-white/90 transition-all duration-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
          {availableDepartments.map(dept => (
            <SelectItem key={dept.id} value={dept.id} className="hover:bg-slate-50/80 rounded-lg transition-all duration-200">
              <div className="flex items-center gap-2">
                {dept.is_leadership_team && <Crown className="h-3 w-3 text-blue-600" />}
                <span className="font-medium">{dept.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
    </div>
  );
};

export default DepartmentSelector;