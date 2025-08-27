import { useState, useEffect } from 'react'
import ActionIf from './ActionIf'
import {
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/solid'
import { fetchUsers, createUser, updateUserProfile, deleteUser, toggleUserStatus } from '../lib/user-management'
import type { UserListItem, CreateUserRequest, UpdateUserProfileRequest } from '../types/user-management'
import RequireRole from './RequireRole'
import UserAvatar from './UserAvatar'

// Update type for partial updates
type UpdateUserData = Omit<UpdateUserProfileRequest, 'id'>

// User Detail Drawer Component
interface UserDrawerProps {
  user: UserListItem | null
  isOpen: boolean
  onClose: () => void
}

function UserDrawer({ user, isOpen, onClose }: UserDrawerProps) {
  if (!isOpen || !user) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Avatar and Name */}
          <div className="text-center">
            <UserAvatar 
              logoUrl={user.logo_url}
              fullName={user.full_name}
              size="xl"
              className="mb-4"
            />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user.full_name}</h3>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
              user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              user.role === 'manager' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
              <p className="text-slate-900 dark:text-slate-100">{user.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
              <p className="text-slate-900 dark:text-slate-100">{user.phone || '—'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Created</label>
              <p className="text-slate-900 dark:text-slate-100">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit User Modal Component
interface EditUserModalProps {
  user: UserListItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, data: UpdateUserData) => Promise<void>
  onToggleStatus: (userId: string, isActive: boolean) => Promise<void>
}

function EditUserModal({ user, isOpen, onClose, onSave, onToggleStatus }: EditUserModalProps) {
  const [formData, setFormData] = useState<UpdateUserData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      await onSave(user.id, formData)
      onClose()
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!user) return

    setIsTogglingStatus(true)
    try {
      await onToggleStatus(user.id, !user.is_active)
      onClose()
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl transform transition-all max-w-lg w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit User</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData((prev: UpdateUserData) => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 dark:text-slate-400">+964</span>
                </div>
                <input
                  type="tel"
                  value={(formData.phone || '').replace(/^\+964/, '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setFormData((prev: UpdateUserData) => ({ ...prev, phone: '+964' + value }));
                  }}
                  className="w-full pl-16 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="7XXXXXXXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Role
              </label>
              <select
                value={formData.role || 'user'}
                onChange={(e) => setFormData((prev: UpdateUserData) => ({ ...prev, role: e.target.value as 'admin' | 'manager' | 'user' }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {/* Status Toggle Button */}
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  user.is_active 
                    ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white'
                    : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                }`}
              >
                {isTogglingStatus 
                  ? (user.is_active ? 'Deactivating...' : 'Activating...')
                  : (user.is_active ? 'Deactivate User' : 'Activate User')
                }
              </button>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Create User Modal Component
interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateUserRequest) => Promise<void>
}

function CreateUserModal({ isOpen, onClose, onSave }: CreateUserModalProps) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'user'
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSave(formData)
      setFormData({ email: '', password: '', full_name: '', phone: '', role: 'user' })
      onClose()
    } catch (error) {
      console.error('Failed to create user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl transform transition-all max-w-lg w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add New User</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev: CreateUserRequest) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev: CreateUserRequest) => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData((prev: CreateUserRequest) => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 dark:text-slate-400">+964</span>
                </div>
                <input
                  type="tel"
                  value={formData.phone.replace(/^\+964/, '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setFormData((prev: CreateUserRequest) => ({ ...prev, phone: '+964' + value }));
                  }}
                  className="w-full pl-16 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="7XXXXXXXXX"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData((prev: CreateUserRequest) => ({ ...prev, role: e.target.value as 'admin' | 'manager' | 'user' }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  user: UserListItem | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

function DeleteConfirmModal({ user, isOpen, onClose, onConfirm }: DeleteConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Failed to delete user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      case 'manager':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      case 'user':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      default:
        return 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Delete User
            </h3>
          </div>
          
          <div className="mb-6">
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Are you sure you want to delete the user "<strong>{user.full_name}</strong>"?
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                User Details:
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Email:</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                    {user.email}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Role:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getRoleColor(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Phone:</span>
                    <span className="text-sm text-slate-900 dark:text-slate-100">
                      {user.phone}
                    </span>
                  </div>
                )}
                
                <div className="flex items-start justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Created:</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100 text-right">
                    {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              This will permanently delete the user account and all associated data. This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-red-400 disabled:to-red-400 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    console.log('🔄 UsersPage mounted, fetching users...')
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      console.log('📡 Starting loadUsers...')
      setIsLoading(true)
      setError(null)
      
      console.log('🌐 Making optimized direct Supabase call to fetchUsers...')
      const usersList = await fetchUsers()
      
      console.log('✅ Users loaded successfully:', usersList)
      console.log('📊 Users count:', usersList?.length || 0)
      
      // Sort users immediately when loaded
      const roleOrder = { 'admin': 1, 'manager': 2, 'user': 3 }
      const sortedUsers = [...usersList].sort((a, b) => {
        const roleComparison = (roleOrder[a.role as keyof typeof roleOrder] || 4) - (roleOrder[b.role as keyof typeof roleOrder] || 4)
        if (roleComparison !== 0) return roleComparison
        return a.full_name.localeCompare(b.full_name)
      })
      
      setUsers(sortedUsers)
      setFilteredUsers(sortedUsers)
    } catch (error: any) {
      console.error('❌ Failed to load users:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response
      })
      setError(error.message || 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort users based on search term
  useEffect(() => {
    let filtered = users
    
    if (searchTerm) {
      filtered = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Sort by role first (admin, manager, user), then by name
    const roleOrder = { 'admin': 1, 'manager': 2, 'user': 3 }
    const sorted = [...filtered].sort((a, b) => {
      const roleComparison = (roleOrder[a.role as keyof typeof roleOrder] || 4) - (roleOrder[b.role as keyof typeof roleOrder] || 4)
      if (roleComparison !== 0) return roleComparison
      return a.full_name.localeCompare(b.full_name)
    })
    
    setFilteredUsers(sorted)
  }, [searchTerm, users])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'manager':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }


  const handleEditUser = (user: UserListItem) => {
    console.log('Edit user clicked:', user)
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleDeleteUser = (user: UserListItem) => {
    console.log('Delete user clicked:', user)
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  const handleCreateUser = async (userData: CreateUserRequest) => {
    console.log('Creating user:', userData)
    try {
      await createUser(userData)
      console.log('User created successfully')
      alert('User created successfully')
      
      // Refresh users list
      await fetchUsers()
    } catch (error: any) {
      console.error('Failed to create user:', error)
      alert(`Failed to create user: ${error.message}`)
    }
  }

  const handleUpdateUser = async (userId: string, userData: UpdateUserData) => {
    console.log('Updating user:', userId, userData)
    try {
      // Get current user data to merge with updates
      const currentUser = users.find(u => u.id === userId)
      if (!currentUser) throw new Error('User not found')
      
      await updateUserProfile({
        ...userData,
        id: userId
      })
      console.log('User updated successfully')
      alert('User updated successfully')
      
      // Refresh users list
      await fetchUsers()
    } catch (error: any) {
      console.error('Failed to update user:', error)
      alert(`Failed to update user: ${error.message}`)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return
    
    console.log('Deleting user:', selectedUser)
    try {
      await deleteUser(selectedUser.id)
      console.log('User deleted successfully')
      alert('User deleted successfully')
      
      // Refresh users list
      await loadUsers()
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      alert(`Failed to delete user: ${error.message}`)
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    console.log('Toggling user status:', userId, 'Active:', isActive)
    try {
      await toggleUserStatus(userId, isActive)
      console.log('User status updated successfully')
      alert(`User ${isActive ? 'activated' : 'deactivated'} successfully`)
      
      // Refresh users list
      await loadUsers()
    } catch (error: any) {
      console.error('Failed to toggle user status:', error)
      alert(`Failed to ${isActive ? 'activate' : 'deactivate'} user: ${error.message}`)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="hidden md:block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
              User Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              Manage user accounts and permissions
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            Add New User
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Active Users</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{users.filter(u => u.is_active).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Admins</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Managers</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{users.filter(u => u.role === 'manager').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UserGroupIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Users</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{users.filter(u => u.role === 'user').length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm font-medium">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-red-600 dark:text-red-400">
                        <p className="font-semibold text-base">Error loading users</p>
                        <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">{error}</p>
                        <button
                          onClick={fetchUsers}
                          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      {searchTerm ? (
                        <div className="text-slate-500 dark:text-slate-400">
                          <p className="font-semibold text-base">No users found</p>
                          <p className="text-sm mt-2">Try adjusting your search or filters</p>
                        </div>
                      ) : (
                        <div className="max-w-md mx-auto">
                          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Team Members Yet</h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-6">
                            You haven't added any team members yet. Start by adding your first user account.
                          </p>
                          <ActionIf ability="users.create">
                            <button
                              onClick={() => setIsCreateModalOpen(true)}
                              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                            >
                              <PlusIcon className="w-5 h-5" />
                              Add Your First User
                            </button>
                          </ActionIf>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!user.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 relative">
                            <UserAvatar 
                              logoUrl={user.logo_url}
                              fullName={user.full_name}
                              size="lg"
                              className="shadow-md"
                            />
                            {!user.is_active && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">!</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {user.full_name}
                              </div>
                              {!user.is_active && (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {user.phone || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex justify-center items-center space-x-2">
                          <RequireRole role="admin">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" 
                              title="Edit User"
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                              title="Delete User"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </RequireRole>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Loading users...</span>
                </div>
              </div>
            ) : error ? (
              <div className="px-6 py-8 text-center">
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium">Error loading users</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button
                    onClick={fetchUsers}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                {searchTerm ? (
                  <div className="text-slate-500 dark:text-slate-400">
                    <p className="font-medium">No users found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Team Members Yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                      You haven't added any team members yet. Start by adding your first user account.
                    </p>
                    <ActionIf ability="users.create">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2 text-sm"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add Your First User
                      </button>
                    </ActionIf>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 ${!user.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 relative">
                          <UserAvatar 
                            logoUrl={user.logo_url}
                            fullName={user.full_name}
                            size="md"
                          />
                          {!user.is_active && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                              {user.full_name}
                            </h3>
                            {!user.is_active && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <RequireRole role="admin">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" 
                          title="Edit User"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                          title="Delete User"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </RequireRole>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <UserDrawer
          user={selectedUser}
          isOpen={isDetailDrawerOpen}
          onClose={() => {
            setIsDetailDrawerOpen(false)
            setSelectedUser(null)
          }}
        />
        
        <EditUserModal
          user={selectedUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedUser(null)
          }}
          onSave={handleUpdateUser}
          onToggleStatus={handleToggleUserStatus}
        />
        
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateUser}
        />
        
        <DeleteConfirmModal
          user={selectedUser}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setSelectedUser(null)
          }}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  )
}
