import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient()

// Database types (to be generated later with supabase gen types)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
        }
        Update: {
          display_name?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          phone?: string | null
          address?: string | null
        }
        Update: {
          name?: string
          phone?: string | null
          address?: string | null
        }
      }
      items: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          unit_price: number
          unit: string
          sku: string | null
          category: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          description?: string | null
          unit_price: number
          unit?: string
          sku?: string | null
          category?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          unit_price?: number
          unit?: string
          sku?: string | null
          category?: string | null
          is_active?: boolean
        }
      }
      layouts: {
        Row: {
          id: string
          user_id: string
          name: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          is_default?: boolean
        }
        Update: {
          name?: string
          is_default?: boolean
        }
      }
      layout_sections: {
        Row: {
          id: string
          layout_id: string
          title: string
          sort_order: number
          created_at: string
        }
        Insert: {
          layout_id: string
          title: string
          sort_order?: number
        }
        Update: {
          title?: string
          sort_order?: number
        }
      }
      layout_fields: {
        Row: {
          id: string
          section_id: string
          label: string
          type: string
          placeholder: string | null
          required: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          section_id: string
          label: string
          type: string
          placeholder?: string | null
          required?: boolean
          sort_order?: number
        }
        Update: {
          label?: string
          type?: string
          placeholder?: string | null
          required?: boolean
          sort_order?: number
        }
      }
      layout_field_options: {
        Row: {
          id: string
          field_id: string
          label: string
          value: string
          sort_order: number
          created_at: string
        }
        Insert: {
          field_id: string
          label: string
          value: string
          sort_order?: number
        }
        Update: {
          label?: string
          value?: string
          sort_order?: number
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          layout_id: string
          form_data: Record<string, unknown> | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total_amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          customer_id: string
          layout_id: string
          form_data?: Record<string, unknown> | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total_amount: number
          status?: string
        }
        Update: {
          customer_id?: string
          layout_id?: string
          form_data?: Record<string, unknown> | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total_amount?: number
          status?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          name: string
          description: string | null
          quantity: number
          price: number
          total: number
          sort_order: number
          created_at: string
        }
        Insert: {
          invoice_id: string
          name: string
          description?: string | null
          quantity: number
          price: number
          total: number
          sort_order?: number
        }
        Update: {
          name?: string
          description?: string | null
          quantity?: number
          price?: number
          total?: number
          sort_order?: number
        }
      }
    }
  }
}
