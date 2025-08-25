export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          business_id: string
          full_name: string
          phone: string
          role: 'admin' | 'manager' | 'user'
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          business_id: string
          full_name: string
          phone: string
          role?: 'admin' | 'manager' | 'user'
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          full_name?: string
          phone?: string
          role?: 'admin' | 'manager' | 'user'
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
