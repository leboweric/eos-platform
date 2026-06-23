import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';

const DepartmentContext = createContext();

const getActiveOrganizationId = (user) => {
  return (
    localStorage.getItem('activeOrganizationId') ||
    localStorage.getItem('organizationId') ||
    user?.organizationId ||
    user?.organization_id ||
    null
  );
};

const getDepartmentStorageKey = (organizationId) =>
  organizationId ? `selectedDepartmentId_${organizationId}` : 'selectedDepartmentId';

export const DepartmentProvider = ({ children }) => {
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [isLeadershipMember, setIsLeadershipMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const resolveDefaultDepartment = useCallback((departments, organizationId) => {
    if (!departments?.length) return null;

    const urlParams = new URLSearchParams(location.search);
    const departmentIdFromUrl = urlParams.get('department');
    const savedDepartmentId = organizationId
      ? localStorage.getItem(getDepartmentStorageKey(organizationId))
      : null;

    if (departmentIdFromUrl) {
      const fromUrl = departments.find((d) => d.id === departmentIdFromUrl);
      if (fromUrl) return fromUrl;
    }

    if (savedDepartmentId) {
      const fromStorage = departments.find((d) => d.id === savedDepartmentId);
      if (fromStorage) return fromStorage;
    }

    return departments.find((d) => d.is_leadership_team) || departments[0];
  }, [location.search]);

  const fetchUserDepartments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const organizationId = getActiveOrganizationId(user);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (organizationId) {
        headers['X-Active-Organization-Id'] = organizationId;
      }

      const response = await fetch(`${apiUrl}/users/departments`, { headers });

      if (!response.ok) {
        console.error('[DepartmentContext] Failed to fetch user departments:', response.status);
        return;
      }

      const result = await response.json();
      const data = result.data || result;
      const departments = data.departments || [];

      setAvailableDepartments(departments);
      setIsLeadershipMember(data.is_leadership_member || false);

      const defaultDepartment = resolveDefaultDepartment(departments, organizationId);
      if (defaultDepartment) {
        setSelectedDepartment(defaultDepartment);
        if (organizationId) {
          localStorage.setItem(getDepartmentStorageKey(organizationId), defaultDepartment.id);
          localStorage.setItem('selectedDepartment', JSON.stringify(defaultDepartment));
        }
      } else {
        setSelectedDepartment(null);
      }
    } catch (error) {
      console.error('[DepartmentContext] Error fetching user departments:', error);
    } finally {
      setLoading(false);
    }
  }, [user, resolveDefaultDepartment]);

  useEffect(() => {
    fetchUserDepartments();
  }, [fetchUserDepartments, user?.organizationId]);

  useEffect(() => {
    const handleOrganizationChanged = () => {
      setSelectedDepartment(null);
      setAvailableDepartments([]);
      fetchUserDepartments();
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged);
    return () => window.removeEventListener('organizationChanged', handleOrganizationChanged);
  }, [fetchUserDepartments]);

  const changeDepartment = (departmentId) => {
    const department = availableDepartments.find((d) => d.id === departmentId);
    if (!department) return;

    const organizationId = getActiveOrganizationId(user);
    setSelectedDepartment(department);

    if (organizationId) {
      localStorage.setItem(getDepartmentStorageKey(organizationId), departmentId);
    }
    localStorage.setItem('selectedDepartment', JSON.stringify(department));

    const newUrl = new URL(window.location);
    newUrl.searchParams.set('department', departmentId);
    navigate(`${newUrl.pathname}${newUrl.search}`, { replace: true });
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