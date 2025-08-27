// --- Centralized axios API client for REST endpoints ---
import axios from 'axios'
import { resolveApiBase } from './base'
import { supabase } from './supabase'
import type { Database } from './supabase'

const apiBase = resolveApiBase()
const apiPrefix = import.meta.env.VITE_API_PREFIX || '/api'
export const API_BASE_URL = `${apiBase}${apiPrefix}`

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
})

// Cache for the current session to avoid repeated getSession calls
let cachedSession: any = null
let sessionPromise: Promise<any> | null = null

// Function to get session with caching
const getCurrentSession = async () => {
  // If we already have a cached session, return it
  if (cachedSession?.access_token) {
    return cachedSession
  }
  
  // If there's already a session request in progress, wait for it
  if (sessionPromise) {
    return await sessionPromise
  }
  
  // Start a new session request
  sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    cachedSession = session
    sessionPromise = null // Clear the promise
    return session
  }).catch(error => {
    console.error('Error getting session:', error)
    sessionPromise = null
    return null
  })
  
  return await sessionPromise
}

// Listen for auth state changes to update cached session
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event)
  cachedSession = session
  
  // Clear cache on sign out
  if (event === 'SIGNED_OUT') {
    cachedSession = null
  }
})

// Attach Supabase access token to every request if present
api.interceptors.request.use(async (config) => {
  try {
    const session = await getCurrentSession()
    if (session?.access_token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${session.access_token}`
    } else {
      console.warn('No authentication token found for API request')
    }
  } catch (error) {
    console.error('Error attaching auth token:', error)
  }
  return config
})

// Type definitions for our API
type Tables = Database['public']['Tables']

export type LayoutRow = Tables['layouts']['Row']
export type LayoutInsert = Tables['layouts']['Insert']
export type LayoutUpdate = Tables['layouts']['Update']
export type CustomerRow = Tables['customers']['Row']
export type CustomerInsert = Tables['customers']['Insert']
export type ItemRow = Tables['items']['Row']
export type ItemInsert = Tables['items']['Insert']
export type ItemUpdate = Tables['items']['Update']
export type InvoiceRow = Tables['invoices']['Row']
export type InvoiceItemInsert = Tables['invoice_items']['Insert']

// Invoice status values used across app
export type InvoiceStatus = 'pending' | 'working' | 'done' | 'refused'

export interface InvoiceStatusSetting {
  id?: string
  user_id?: string
  status: InvoiceStatus
  default_message: string
  allow_extra_note: boolean
  send_whatsapp: boolean
}

// Extended types for deep fetching
export interface LayoutWithCounts extends LayoutRow {
  layout_sections?: Array<{
    id: string
    layout_fields?: Array<{
      id: string
      layout_field_options?: Array<{
        id: string
      }>
    }>
  }>
}

export interface LayoutWithSections extends LayoutRow {
  sections: Array<{
    id: string
    title: string
    sort_order: number
    fields: Array<{
      id: string
      label: string
      type: string
      placeholder: string | null
      required: boolean
      sort_order: number
      options: Array<{
        id: string
        label: string
        value: string
        sort_order: number
      }>
    }>
  }>
}

// Helper types for the nested query result
interface LayoutQueryResult extends LayoutRow {
  layout_sections: Array<{
    id: string
    title: string
    sort_order: number
    layout_fields: Array<{
      id: string
      label: string
      type: string
      placeholder: string | null
      required: boolean
      sort_order: number
      layout_field_options: Array<{
        id: string
        label: string
        value: string
        sort_order: number
      }>
    }>
  }>
}

export interface InvoiceWithDetails extends InvoiceRow {
  customer: CustomerRow
  layout: LayoutRow
  items: Array<{
    id: string
    name: string
    description: string | null
    quantity: number
    price: number
    total: number
    sort_order: number
  }>
}

export interface InvoiceWithRelations extends InvoiceRow {
  customers: CustomerRow
  layouts: LayoutRow
}

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export const signUp = async (email: string, password: string, displayName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  if (error) throw error
  
  // Create profile if user was created
  if (data.user) {
    await createProfile(data.user.id, displayName)
  }
  
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// =====================================================
// PROFILE MANAGEMENT
// =====================================================

export const createProfile = async (userId: string, displayName?: string) => {
  // Get user email from auth user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user found')
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: user.email!,
      password_hash: 'managed_by_supabase', // Placeholder since Supabase handles auth
      display_name: displayName || null,
      role: 'user'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const updateProfile = async (userId: string, updates: { display_name?: string }) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =====================================================
// USER MANAGEMENT (Admin Only)
// =====================================================

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'admin' | 'manager' | 'user'
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  full_name: string
  phone: string
  role: 'admin' | 'manager' | 'user'
}

export interface UpdateUserData {
  full_name?: string
  phone?: string
  role?: 'admin' | 'manager' | 'user'
}

export const listUsers = async (): Promise<User[]> => {
  const response = await api.get('/admin/users')
  if (response.data.status === 'error') {
    throw new Error(response.data.error)
  }
  return response.data.data
}

export const createUser = async (userData: CreateUserData): Promise<void> => {
  const response = await api.post('/admin/users', userData)
  if (response.data.status === 'error') {
    throw new Error(response.data.error)
  }
}

export const updateUserProfile = async (userId: string, userData: UpdateUserData): Promise<User> => {
  const response = await api.put(`/admin/users/${userId}`, userData)
  if (response.data.status === 'error') {
    throw new Error(response.data.error)
  }
  return response.data.data
}

export const deleteUser = async (userId: string): Promise<void> => {
  const response = await api.delete(`/admin/users/${userId}`)
  if (response.data.status === 'error') {
    throw new Error(response.data.error)
  }
}

// =====================================================
// CUSTOMER MANAGEMENT
// =====================================================

export const fetchCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data
}

// =====================================================
// USER MANAGEMENT (OPTIMIZED)
// =====================================================

export const fetchUsers = async () => {
  // Use the backend API but with optimized caching
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  if (data.status === 'error') {
    throw new Error(data.error)
  }

  return data.data
}

export const createCustomer = async (customer: Omit<CustomerInsert, 'user_id'>) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...customer,
      user_id: user.id
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateCustomer = async (id: string, updates: Omit<CustomerInsert, 'user_id'>) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// =====================================================
// ITEM MANAGEMENT
// =====================================================

export const fetchItems = async () => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
  if (error) throw error
  return data
}

export const createItem = async (item: Omit<ItemInsert, 'user_id'>) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('items')
    .insert({
      ...item,
      user_id: user.id
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateItem = async (id: string, updates: Omit<ItemUpdate, 'user_id'>) => {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteItem = async (id: string) => {
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('items')
    .update({ is_active: false })
    .eq('id', id)
  
  if (error) throw error
}

// =====================================================
// LAYOUT MANAGEMENT
// =====================================================

export const fetchLayouts = async (): Promise<LayoutWithCounts[]> => {
  const { data, error } = await supabase
    .from('layouts')
    .select(`
      *,
      layout_sections(
        id,
        layout_fields(
          id,
          layout_field_options(id)
        )
      )
    `)
    .order('name')
  
  if (error) throw error
  return data
}

export const fetchLayoutDeep = async (layoutId: string): Promise<LayoutWithSections> => {
  const { data, error } = await supabase
    .from('layouts')
    .select(`
      *,
      layout_sections (
        id,
        title,
        sort_order,
        layout_fields (
          id,
          label,
          type,
          placeholder,
          required,
          sort_order,
          layout_field_options (
            id,
            label,
            value,
            sort_order
          )
        )
      )
    `)
    .eq('id', layoutId)
    .single()
  
  if (error) throw error
  
  // Transform the nested data structure
  const result = data as LayoutQueryResult
  const transformedData: LayoutWithSections = {
    ...result,
    sections: (result.layout_sections || []).map((section) => ({
      id: section.id,
      title: section.title,
      sort_order: section.sort_order,
      fields: (section.layout_fields || []).map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        required: field.required,
        sort_order: field.sort_order,
        options: (field.layout_field_options || []).map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          sort_order: option.sort_order
        }))
      }))
    }))
  }
  
  return transformedData
}

export const saveLayout = async (layout: Omit<LayoutInsert, 'user_id'>) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('layouts')
    .insert({
      ...layout,
      user_id: user.id
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateLayout = async (id: string, updates: LayoutUpdate) => {
  const { data, error } = await supabase
    .from('layouts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteLayout = async (id: string, options?: { force?: boolean; reassignTo?: string }) => {
  // Get current session to get the access token
  const session = await getCurrentSession()
  if (!session?.access_token) {
    throw new Error('No authentication token found')
  }

  const queryParams = new URLSearchParams()
  if (options?.force) queryParams.append('force', 'true')
  if (options?.reassignTo) queryParams.append('reassignTo', options.reassignTo)
  
  const url = `${import.meta.env.VITE_API_URL}/api/layouts/${id}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw errorData
  }
}

export const setDefaultLayout = async (layoutId: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  // First, unset all default layouts for this user
  await supabase
    .from('layouts')
    .update({ is_default: false })
    .eq('user_id', user.id)
  
  // Then set the new default
  const { data, error } = await supabase
    .from('layouts')
    .update({ is_default: true })
    .eq('id', layoutId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const removeDefaultLayout = async (layoutId: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  // Remove default status from the specified layout
  const { data, error } = await supabase
    .from('layouts')
    .update({ is_default: false })
    .eq('id', layoutId)
    .eq('user_id', user.id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =====================================================
// LAYOUT SECTIONS MANAGEMENT
// =====================================================

export const createLayoutSection = async (section: {
  layout_id: string
  title: string
  sort_order?: number
}) => {
  const { data, error } = await supabase
    .from('layout_sections')
    .insert(section)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateLayoutSection = async (id: string, updates: {
  title?: string
  sort_order?: number
}) => {
  const { data, error } = await supabase
    .from('layout_sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteLayoutSection = async (id: string) => {
  const { error } = await supabase
    .from('layout_sections')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// =====================================================
// LAYOUT FIELDS MANAGEMENT
// =====================================================

export const createLayoutField = async (field: {
  section_id: string
  label: string
  type: string
  placeholder?: string
  required?: boolean
  sort_order?: number
}) => {
  const { data, error } = await supabase
    .from('layout_fields')
    .insert(field)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateLayoutField = async (id: string, updates: {
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  sort_order?: number
}) => {
  const { data, error } = await supabase
    .from('layout_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteLayoutField = async (id: string) => {
  const { error } = await supabase
    .from('layout_fields')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// =====================================================
// LAYOUT FIELD OPTIONS MANAGEMENT
// =====================================================

export const createLayoutFieldOption = async (option: {
  field_id: string
  label: string
  value: string
  sort_order?: number
}) => {
  const { data, error } = await supabase
    .from('layout_field_options')
    .insert(option)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateLayoutFieldOption = async (id: string, updates: {
  label?: string
  value?: string
  sort_order?: number
}) => {
  const { data, error } = await supabase
    .from('layout_field_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteLayoutFieldOption = async (id: string) => {
  const { error } = await supabase
    .from('layout_field_options')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// =====================================================
// INVOICE MANAGEMENT
// =====================================================

export const fetchInvoices = async (): Promise<InvoiceWithRelations[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers (
        id,
        name,
        phone,
        address
      ),
      layouts (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as InvoiceWithRelations[]
}

export const fetchInvoiceWithDetails = async (invoiceId: string): Promise<InvoiceWithDetails> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers (*),
      layouts (*),
      invoice_items (*)
    `)
    .eq('id', invoiceId)
    .single()
  
  if (error) throw error
  return data as InvoiceWithDetails
}

export const saveInvoice = async (invoice: {
  customer_id: string
  layout_id?: string | null
  form_data?: Record<string, unknown>
  totals: {
    subtotal: number
    tax_rate: number
    tax: number
    grand_total: number
  }
  items: Array<{
    name: string
    description?: string
    quantity: number
    price: number
    total: number
  }>
  status?: InvoiceStatus
}) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  // Start a transaction by creating the invoice first
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      customer_id: invoice.customer_id,
      layout_id: invoice.layout_id || null,
      form_data: invoice.form_data || null,
      totals: invoice.totals,
      // If provided, include status; otherwise DB default ('pending') will be used
      ...(invoice.status ? { status: invoice.status } : {})
    })
    .select()
    .single()
  
  if (invoiceError) throw invoiceError
  
  // Then create the invoice items
  const itemsToInsert: InvoiceItemInsert[] = invoice.items.map((item, index) => ({
    invoice_id: invoiceData.id,
    name: item.name,
    description: item.description || null,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
    sort_order: index
  }))
  
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(itemsToInsert)
  
  if (itemsError) throw itemsError
  
  return invoiceData
}

export const updateInvoice = async (id: string, updates: {
  customer_id?: string
  layout_id?: string | null
  form_data?: Record<string, unknown>
  totals?: {
    subtotal: number
    tax_rate: number
    tax: number
    grand_total: number
  }
  status?: InvoiceStatus
}) => {
  // Basic client-side validation for status if provided
  if (updates.status && !['pending','working','done','refused'].includes(updates.status)) {
    throw new Error('Invalid status value')
  }
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =====================================================
// STATUS SETTINGS AND STATUS CHANGE (via backend API)
// =====================================================

export const getStatusSettings = async (): Promise<InvoiceStatusSetting[]> => {
  const { data } = await api.get('/status-settings')
  return data as InvoiceStatusSetting[]
}

export const updateStatusSettings = async (settings: InvoiceStatusSetting[]): Promise<InvoiceStatusSetting[]> => {
  const { data } = await api.put('/status-settings', settings)
  return data as InvoiceStatusSetting[]
}

export const changeInvoiceStatus = async (
  invoiceId: string,
  status: InvoiceStatus,
  extra_note?: string
): Promise<{ invoice: any; whatsapp?: any }> => {
  const { data } = await api.patch(`/invoices/${invoiceId}/status`, { status, extra_note })
  return data
}

export const deleteInvoice = async (id: string) => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// =====================================================
// INVOICE ITEMS MANAGEMENT
// =====================================================

export const updateInvoiceItems = async (invoiceId: string, items: Array<{
  id?: string
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}>) => {
  // Delete existing items
  await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId)
  
  // Insert new items
  const itemsToInsert: InvoiceItemInsert[] = items.map((item, index) => ({
    invoice_id: invoiceId,
    name: item.name,
    description: item.description || null,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
    sort_order: index
  }))
  
  const { data, error } = await supabase
    .from('invoice_items')
    .insert(itemsToInsert)
    .select()
  
  if (error) throw error
  return data
}

// Get customer invoice history and timeline
export const fetchCustomerHistory = async (customerId: string) => {
  console.log('📊 Fetching customer history for:', customerId)
  const response = await api.get(`/customers/${customerId}/history`)
  console.log('✅ Customer history fetched:', response.data)
  return response.data
}
