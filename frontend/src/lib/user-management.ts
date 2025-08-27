import { supabase } from './supabase';
import { api, fetchUsers as apiFetchUsers } from './api';
import type { 
  UserListItem, 
  CreateUserRequest, 
  UpdateUserProfileRequest, 
  UserManagementError
} from '../types/user-management';

/**
 * List all users in the current business using optimized direct Supabase query
 */
export async function fetchUsers(): Promise<UserListItem[]> {
  return apiFetchUsers() as Promise<UserListItem[]>;
}

/**
 * Deactivate or activate a user (requires admin privileges)
 */
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
  try {
    const response = await api.patch(`/admin/users/${userId}/status`, { is_active: isActive });
    
    if (response.data.status === 'error') {
      throw new Error(response.data.error);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while updating user status');
  }
}

/**
 * List all users in the current business using backend API (legacy - slower)
 */
export async function listUsers(): Promise<UserListItem[]> {
  try {
    const response = await api.get('/admin/users');
    
    if (response.data.status === 'error') {
      throw new Error(response.data.error);
    }

    const data = response.data.data;
    console.log('Users data with logo_url:', data?.map((user: any) => ({ 
      name: user.full_name, 
      logo_url: user.logo_url 
    })));

    return data as UserListItem[];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while listing users');
  }
}

/**
 * Create a new user (requires admin privileges)
 * Uses server-side API route to handle auth.admin operations
 */
export async function createUser(userData: CreateUserRequest): Promise<void> {
  try {
    const response = await api.post('/admin/users', userData);

    if (response.data.status === 'error') {
      const userError: UserManagementError = new Error(response.data.error || 'Failed to create user');
      userError.status = response.status;
      throw userError;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while creating user');
  }
}

/**
 * Update a user profile (requires admin privileges)
 */
export async function updateUserProfile(updates: UpdateUserProfileRequest): Promise<void> {
  try {
    const { id, ...updateData } = updates;
    
    const response = await api.put(`/admin/users/${id}`, updateData);
    
    if (response.data.status === 'error') {
      throw new Error(response.data.error);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while updating user profile');
  }
}

/**
 * Delete a user (requires admin privileges)
 * Uses server-side API route to handle auth.admin operations
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await api.delete(`/admin/users/${userId}`);

    if (response.data.status === 'error') {
      const userError: UserManagementError = new Error(response.data.error || 'Failed to delete user');
      userError.status = response.status;
      throw userError;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while deleting user');
  }
}

/**
 * Get user by ID (for detailed view)
 */
export async function getUserById(userId: string): Promise<UserListItem | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, logo_url, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      const userError: UserManagementError = new Error(`Failed to get user: ${error.message}`);
      userError.code = error.code;
      throw userError;
    }

    return data as UserListItem;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while getting user');
  }
}

/**
 * Check if current user has admin privileges
 */
export async function checkAdminPermissions(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to check admin permissions:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    return false;
  }
}
