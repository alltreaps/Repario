// Re-export all layout types
export * from './layout'

// Item type for the product catalog
export interface Item {
  id: string
  user_id: string
  name: string
  description?: string
  unit_price: number
  unit: string
  sku?: string
  category?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Invoice item type (different from catalog item)
export interface InvoiceItem {
  id: string
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}
