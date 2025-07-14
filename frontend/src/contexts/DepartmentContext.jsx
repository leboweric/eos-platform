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
      console.log('[DepartmentContext] Fetching user departments...');
      console.log('[DepartmentContext] User:', user);
      
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        console.error('[DepartmentContext] No token found in localStorage');
        console.log('[DepartmentContext] Available keys:', Object.keys(localStorage));
        setLoading(false);
        return;
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const fullUrl = `${apiUrl}/users/departments`;
      console.log('[DepartmentContext] Making request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[DepartmentContext] Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[DepartmentContext] API Response:', result);
        
        const data = result.data || result; // Handle different response formats
        
        console.log('[DepartmentContext] Departments:', data.departments);
        console.log('[DepartmentContext] Is Leadership:', data.is_leadership_member);
        
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
        } else {
          console.warn('[DepartmentContext] No departments found for user');
        }
      } else {
        console.error('[DepartmentContext] Failed to fetch user departments:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[DepartmentContext] Error response:', errorText);
        
        // If 404, it might mean the endpoint doesn't exist yet
        if (response.status === 404) {
          console.error('[DepartmentContext] Departments endpoint not found. Backend may need updating.');
        }
        
      }
    } catch (error) {
      console.error('[DepartmentContext] Error fetching user departments:', error);
      console.error('[DepartmentContext] Error details:', error.message, error.stack);
      
    } finally {
      setLoading(false);
      console.log('[DepartmentContext] Loading complete. State:', {
        selectedDepartment,
        availableDepartments,
        isLeadershipMember
      });
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