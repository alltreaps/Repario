import { useLayoutActions } from '../stores/layoutStore'
import type { CreateLayout, FieldType, Layout, Section, Field, FieldOption } from '../types/layout'

/**
 * Custom hook for layout operations with helper functions
 */
export const useLayoutOperations = () => {
  const actions = useLayoutActions()

  /**
   * Create a new layout with a basic structure
   */
  const createNewLayout = (name: string) => {
    const newLayout: CreateLayout = {
      name,
      sections: [
        {
          title: 'Basic Information',
          fields: [
            {
              label: 'Title',
              type: 'input',
              placeholder: 'Enter title...',
              required: true
            }
          ]
        }
      ]
    }
    
    actions.addLayout(newLayout)
  }

  /**
   * Duplicate an existing layout
   */
  const duplicateLayout = (originalLayout: Layout) => {
    const duplicatedLayout: CreateLayout = {
      name: `${originalLayout.name} (Copy)`,
      sections: originalLayout.sections.map((section: Section) => ({
        title: section.title,
        fields: section.fields.map((field: Field) => ({
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options ? field.options.map((option: FieldOption) => ({
            label: option.label,
            value: option.value
          })) : undefined
        }))
      }))
    }
    
    actions.addLayout(duplicatedLayout)
  }

  /**
   * Add a field with common default values based on type
   */
  const addFieldWithDefaults = (layoutId: string, sectionId: string, fieldType: FieldType) => {
    const baseField = {
      type: fieldType,
    }

    let fieldData

    switch (fieldType) {
      case 'input':
        fieldData = {
          ...baseField,
          label: 'New Input Field',
          placeholder: 'Enter value...',
          required: false
        }
        break
      case 'description':
        fieldData = {
          ...baseField,
          label: 'Description',
          placeholder: 'Enter description...',
          required: false
        }
        break
      case 'dropdown':
        fieldData = {
          ...baseField,
          label: 'Select Option',
          required: false,
          options: [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' }
          ]
        }
        break
      case 'checkboxes':
        fieldData = {
          ...baseField,
          label: 'Select Multiple',
          required: false,
          options: [
            { label: 'Choice 1', value: 'choice1' },
            { label: 'Choice 2', value: 'choice2' }
          ]
        }
        break
      default:
        fieldData = {
          ...baseField,
          label: 'New Field',
          required: false
        }
    }

    actions.addField(layoutId, sectionId, fieldData)
  }

  return {
    ...actions,
    createNewLayout,
    duplicateLayout,
    addFieldWithDefaults
  }
}
