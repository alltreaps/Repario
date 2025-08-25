// Core field types for the layout system
export type FieldType = 'input' | 'description' | 'dropdown' | 'checkboxes'

// Field option for dropdown and checkbox fields
export interface FieldOption {
  id: string
  label: string
  value: string
}

// Field definition with all possible properties
export interface Field {
  id: string
  label: string
  type: FieldType
  options?: FieldOption[] // for dropdown and checkboxes
  placeholder?: string
  required?: boolean
}

// Section containing multiple fields
export interface Section {
  id: string
  title: string
  fields: Field[]
}

// Complete layout definition
export interface Layout {
  id: string
  name: string
  sections: Section[]
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

// Store state interface
export interface LayoutStore {
  layouts: Layout[]
  
  // Layout operations
  addLayout: (layout: CreateLayout) => void
  updateLayout: (id: string, updates: Partial<Omit<Layout, 'id'>>) => void
  deleteLayout: (id: string) => void
  getLayout: (id: string) => Layout | undefined
  setDefaultLayout: (id: string) => void
  
  // Section operations
  addSection: (layoutId: string, section: CreateSection) => void
  updateSection: (layoutId: string, sectionId: string, updates: Partial<Omit<Section, 'id'>>) => void
  deleteSection: (layoutId: string, sectionId: string) => void
  
  // Field operations
  addField: (layoutId: string, sectionId: string, field: CreateField) => void
  updateField: (layoutId: string, sectionId: string, fieldId: string, updates: Partial<Omit<Field, 'id'>>) => void
  deleteField: (layoutId: string, sectionId: string, fieldId: string) => void
  
  // Field option operations
  addOption: (layoutId: string, sectionId: string, fieldId: string, option: CreateFieldOption) => void
  updateOption: (layoutId: string, sectionId: string, fieldId: string, optionId: string, updates: Partial<Omit<FieldOption, 'id'>>) => void
  deleteOption: (layoutId: string, sectionId: string, fieldId: string, optionId: string) => void
}

// Helper types for creating new entities
export type CreateLayout = {
  name: string
  sections: CreateSection[]
  isDefault?: boolean
}
export type CreateSection = Omit<Section, 'id' | 'fields'> & {
  fields: CreateField[]
}
export type CreateField = Omit<Field, 'id' | 'options'> & {
  options?: CreateFieldOption[]
}
export type CreateFieldOption = Omit<FieldOption, 'id'>

// Utility types for updates
export type UpdateLayout = Partial<Omit<Layout, 'id'>>
export type UpdateSection = Partial<Omit<Section, 'id'>>
export type UpdateField = Partial<Omit<Field, 'id'>>
export type UpdateFieldOption = Partial<Omit<FieldOption, 'id'>>
