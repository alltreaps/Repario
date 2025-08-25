import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { 
  Layout, 
  Section, 
  Field, 
  FieldOption, 
  LayoutStore,
  CreateLayout,
  CreateSection,
  CreateField,
  CreateFieldOption
} from '../types/layout'

// Generate unique ID
const generateId = () => uuidv4()

// Get current timestamp
const getCurrentTimestamp = () => new Date().toISOString()

// Default layouts for initial state
const createDefaultLayouts = (): Layout[] => [
  {
    id: generateId(),
    name: 'Default Layout',
    isDefault: true,
    sections: [
      {
        id: generateId(),
        title: 'Company Information',
        fields: [
          {
            id: generateId(),
            label: 'Company Name',
            type: 'input',
            placeholder: 'Enter company name',
            required: true
          },
          {
            id: generateId(),
            label: 'Company Address',
            type: 'description',
            placeholder: 'Enter company address'
          }
        ]
      },
      {
        id: generateId(),
        title: 'Client Information',
        fields: [
          {
            id: generateId(),
            label: 'Client Name',
            type: 'input',
            placeholder: 'Enter client name',
            required: true
          },
          {
            id: generateId(),
            label: 'Client Type',
            type: 'dropdown',
            options: [
              { id: generateId(), label: 'Corporate', value: 'corporate' },
              { id: generateId(), label: 'Individual', value: 'individual' },
              { id: generateId(), label: 'Non-profit', value: 'nonprofit' }
            ]
          }
        ]
      }
    ],
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  },
  {
    id: generateId(),
    name: 'Minimal Layout',
    isDefault: false,
    sections: [
      {
        id: generateId(),
        title: 'Basic Information',
        fields: [
          {
            id: generateId(),
            label: 'Invoice Title',
            type: 'input',
            placeholder: 'Enter invoice title',
            required: true
          },
          {
            id: generateId(),
            label: 'Description',
            type: 'description',
            placeholder: 'Enter description'
          }
        ]
      }
    ],
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  }
]

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      layouts: createDefaultLayouts(),

      // Layout operations
      addLayout: (layoutData: CreateLayout) => {
        const processSection = (sectionData: CreateSection): Section => ({
          id: generateId(),
          title: sectionData.title,
          fields: sectionData.fields.map(processField)
        })

        const processField = (fieldData: CreateField): Field => ({
          id: generateId(),
          label: fieldData.label,
          type: fieldData.type,
          placeholder: fieldData.placeholder,
          required: fieldData.required,
          options: fieldData.options?.map(processOption)
        })

        const processOption = (optionData: CreateFieldOption): FieldOption => ({
          id: generateId(),
          label: optionData.label,
          value: optionData.value
        })

        const newLayout: Layout = {
          id: generateId(),
          name: layoutData.name,
          sections: layoutData.sections.map(processSection),
          isDefault: layoutData.isDefault,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp()
        }

        set((state) => ({
          layouts: [...state.layouts, newLayout]
        }))
      },

      updateLayout: (id: string, updates) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === id
              ? { ...layout, ...updates, updatedAt: getCurrentTimestamp() }
              : layout
          )
        }))
      },

      deleteLayout: (id: string) => {
        set((state) => {
          const layoutToDelete = state.layouts.find(l => l.id === id)
          if (layoutToDelete?.isDefault) {
            console.warn('Cannot delete default layout')
            return state
          }
          
          return {
            layouts: state.layouts.filter((layout) => layout.id !== id)
          }
        })
      },

      getLayout: (id: string) => {
        return get().layouts.find((layout) => layout.id === id)
      },

      setDefaultLayout: (id: string) => {
        set((state) => ({
          layouts: state.layouts.map((layout) => ({
            ...layout,
            isDefault: layout.id === id,
            updatedAt: layout.id === id ? getCurrentTimestamp() : layout.updatedAt
          }))
        }))
      },

      // Section operations
      addSection: (layoutId: string, sectionData: CreateSection) => {
        const processField = (fieldData: CreateField): Field => ({
          id: generateId(),
          label: fieldData.label,
          type: fieldData.type,
          placeholder: fieldData.placeholder,
          required: fieldData.required,
          options: fieldData.options?.map(optionData => ({
            id: generateId(),
            label: optionData.label,
            value: optionData.value
          }))
        })

        const newSection: Section = {
          id: generateId(),
          title: sectionData.title,
          fields: sectionData.fields.map(processField)
        }

        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: [...layout.sections, newSection],
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      updateSection: (layoutId: string, sectionId: string, updates) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId ? { ...section, ...updates } : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      deleteSection: (layoutId: string, sectionId: string) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.filter((section) => section.id !== sectionId),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      // Field operations
      addField: (layoutId: string, sectionId: string, fieldData: CreateField) => {
        const newField: Field = {
          id: generateId(),
          label: fieldData.label,
          type: fieldData.type,
          placeholder: fieldData.placeholder,
          required: fieldData.required,
          options: fieldData.options?.map(optionData => ({
            id: generateId(),
            label: optionData.label,
            value: optionData.value
          }))
        }

        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId
                      ? { ...section, fields: [...section.fields, newField] }
                      : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      updateField: (layoutId: string, sectionId: string, fieldId: string, updates) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId
                      ? {
                          ...section,
                          fields: section.fields.map((field) =>
                            field.id === fieldId ? { ...field, ...updates } : field
                          )
                        }
                      : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      deleteField: (layoutId: string, sectionId: string, fieldId: string) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId
                      ? {
                          ...section,
                          fields: section.fields.filter((field) => field.id !== fieldId)
                        }
                      : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      // Field option operations
      addOption: (layoutId: string, sectionId: string, fieldId: string, optionData: CreateFieldOption) => {
        const newOption: FieldOption = {
          id: generateId(),
          label: optionData.label,
          value: optionData.value
        }

        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId
                      ? {
                          ...section,
                          fields: section.fields.map((field) =>
                            field.id === fieldId
                              ? {
                                  ...field,
                                  options: [...(field.options || []), newOption]
                                }
                              : field
                          )
                        }
                      : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      updateOption: (layoutId: string, sectionId: string, fieldId: string, optionId: string, updates) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId
                      ? {
                          ...section,
                          fields: section.fields.map((field) =>
                            field.id === fieldId
                              ? {
                                  ...field,
                                  options: field.options?.map((option) =>
                                    option.id === optionId ? { ...option, ...updates } : option
                                  )
                                }
                              : field
                          )
                        }
                      : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      },

      deleteOption: (layoutId: string, sectionId: string, fieldId: string, optionId: string) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId
              ? {
                  ...layout,
                  sections: layout.sections.map((section) =>
                    section.id === sectionId
                      ? {
                          ...section,
                          fields: section.fields.map((field) =>
                            field.id === fieldId
                              ? {
                                  ...field,
                                  options: field.options?.filter((option) => option.id !== optionId)
                                }
                              : field
                          )
                        }
                      : section
                  ),
                  updatedAt: getCurrentTimestamp()
                }
              : layout
          )
        }))
      }
    }),
    {
      name: 'repario-layout-store',
      version: 1,
      // Only persist the layouts data
      partialize: (state) => ({ layouts: state.layouts })
    }
  )
)

// Utility hooks for easier access to specific data
export const useLayouts = () => useLayoutStore((state) => state.layouts)
export const useLayout = (id: string) => useLayoutStore((state) => state.getLayout(id))
export const useDefaultLayout = () => useLayoutStore((state) => 
  state.layouts.find(layout => layout.isDefault)
)

// Hook for layout actions
export const useLayoutActions = () => {
  const store = useLayoutStore()
  return {
    addLayout: store.addLayout,
    updateLayout: store.updateLayout,
    deleteLayout: store.deleteLayout,
    setDefaultLayout: store.setDefaultLayout,
    addSection: store.addSection,
    updateSection: store.updateSection,
    deleteSection: store.deleteSection,
    addField: store.addField,
    updateField: store.updateField,
    deleteField: store.deleteField,
    addOption: store.addOption,
    updateOption: store.updateOption,
    deleteOption: store.deleteOption
  }
}
