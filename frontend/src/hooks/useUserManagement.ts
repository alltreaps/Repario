import { useState, useEffect, useCallback } from 'react';
import { 
  listUsers, 
  createUser, 
  updateUserProfile, 
  deleteUser, 
  getUserById,
  checkAdminPermissions 
} from '../lib/user-management';
import type { 
  UserListItem, 
  CreateUserRequest, 
  UpdateUserProfileRequest 
} from '../types/user-management';

export interface UseUserManagementReturn {
  // Data
  users: UserListItem[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;

  // Actions
  refreshUsers: () => Promise<void>;
  createNewUser: (userData: CreateUserRequest) => Promise<void>;
  updateUser: (updates: UpdateUserProfileRequest) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  getUser: (userId: string) => Promise<UserListItem | null>;

  // State helpers
  clearError: () => void;
}

export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const hasAdminAccess = await checkAdminPermissions();
        setIsAdmin(hasAdminAccess);
      } catch (error) {
        console.error('Failed to check admin permissions:', error);
        setIsAdmin(false);
      }
    };

    checkPermissions();
  }, []);

  // Load users
  const refreshUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userList = await listUsers();
      setUsers(userList);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
      setError(errorMessage);
      console.error('Failed to refresh users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new user
  const createNewUser = useCallback(async (userData: CreateUserRequest) => {
    try {
      setError(null);
      await createUser(userData);
      await refreshUsers(); // Refresh the list after creation
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      setError(errorMessage);
      throw error; // Re-throw so calling component can handle it
    }
  }, [refreshUsers]);

  // Update user profile
  const updateUser = useCallback(async (updates: UpdateUserProfileRequest) => {
    try {
      setError(null);
      await updateUserProfile(updates);
      await refreshUsers(); // Refresh the list after update
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setError(errorMessage);
      throw error; // Re-throw so calling component can handle it
    }
  }, [refreshUsers]);

  // Remove user
  const removeUser = useCallback(async (userId: string) => {
    try {
      setError(null);
      await deleteUser(userId);
      await refreshUsers(); // Refresh the list after deletion
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      setError(errorMessage);
      throw error; // Re-throw so calling component can handle it
    }
  }, [refreshUsers]);

  // Get specific user
  const getUser = useCallback(async (userId: string): Promise<UserListItem | null> => {
    try {
      setError(null);
      return await getUserById(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load users on mount
  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  return {
    // Data
    users,
    isLoading,
    error,
    isAdmin,

    // Actions
    refreshUsers,
    createNewUser,
    updateUser,
    removeUser,
    getUser,

    // State helpers
    clearError,
  };
}
