import { supabase } from './supabase';
import { api } from './api';
import type { 
  UserListItem, 
  CreateUserRequest, 
  UpdateUserProfileRequest, 
  UserManagementError
} from '../types/user-management';

/**
 * List all users in the current business (RLS auto-scopes to current business)
 */
export async function listUsers(): Promise<UserListItem[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      const userError: UserManagementError = new Error(`Failed to list users: ${error.message}`);
      userError.code = error.code;
      throw userError;
    }

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
 * Update user profile information (requires admin privileges per RLS)
 */
export async function updateUserProfile(updates: UpdateUserProfileRequest): Promise<void> {
  try {
    const { id, ...updateData } = updates;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      const userError: UserManagementError = new Error(`Failed to update user profile: ${error.message}`);
      userError.code = error.code;
      throw userError;
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
      .select('id, email, full_name, phone, role, created_at')
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
