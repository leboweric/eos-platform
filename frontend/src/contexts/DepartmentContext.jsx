import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const DepartmentContext = createContext();

export const DepartmentProvider = ({ children }) => {
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [isLeadershipMember, setIsLeadershipMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  
  useEffect(() => {
    if (user) {
      fetchUserDepartments();
    }
  }, [user]);
  
  const fetchUserDepartments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/users/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result; // Handle different response formats
        
        setAvailableDepartments(data.departments || []);
        setIsLeadershipMember(data.is_leadership_member || false);
        
        // Set default department
        const savedDepartmentId = localStorage.getItem('selectedDepartmentId');
        let defaultDepartment;
        
        if (savedDepartmentId && data.departments) {
          defaultDepartment = data.departments.find(d => d.id === savedDepartmentId);
        }
        
        if (!defaultDepartment && data.departments && data.departments.length > 0) {
          // Default to Leadership Team if available, otherwise first department
          defaultDepartment = data.departments.find(d => d.is_leadership_team) || data.departments[0];
        }
        
        if (defaultDepartment) {
          setSelectedDepartment(defaultDepartment);
          localStorage.setItem('selectedDepartmentId', defaultDepartment.id);
        }
      } else {
        console.error('Failed to fetch user departments:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user departments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const changeDepartment = (departmentId) => {
    const department = availableDepartments.find(d => d.id === departmentId);
    if (department) {
      setSelectedDepartment(department);
      localStorage.setItem('selectedDepartmentId', departmentId);
    }
  };
  
  return (
    <DepartmentContext.Provider value={{
      selectedDepartment,
      availableDepartments,
      isLeadershipMember,
      loading,
      changeDepartment,
      refetchDepartments: fetchUserDepartments
    }}>
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
};