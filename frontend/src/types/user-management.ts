import type { Database } from './database.types.js';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

export type CreateUserRequest = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'manager' | 'user';
};

export type UpdateUserProfileRequest = {
  id: string;
  full_name?: string;
  phone?: string;
  role?: 'admin' | 'manager' | 'user';
};

export type UserListItem = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
};

export interface UserManagementError extends Error {
  code?: string;
  status?: number;
}

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: 'success' | 'error';
};
