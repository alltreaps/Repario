import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XMarkIcon,
  Square2StackIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/solid'
import { fetchLayoutDeep, fetchLayouts, api } from '../lib/api'
import { useLayoutContext } from '../contexts/LayoutContext'
import { useTranslation } from '../contexts/LanguageContext'
import type { FieldType, Section, Field, CreateField, Layout } from '../types/layout'

export default function LayoutDesignerPage() {
  const { layoutId } = useParams<{ layoutId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const paramLayoutId = searchParams.get('layoutId')
  const actualLayoutId = layoutId || paramLayoutId || ''
  const { setCurrentLayoutName } = useLayoutContext()
  const { t } = useTranslation()
  
  const [layout, setLayout] = useState<Layout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [showEditSectionModal, setShowEditSectionModal] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const [fieldData, setFieldData] = useState<Partial<CreateField>>({})
  const [copyingSection, setCopyingSection] = useState<string | null>(null)
  const [availableLayouts, setAvailableLayouts] = useState<Layout[]>([])
  const [targetLayoutId, setTargetLayoutId] = useState('')
  const [copyingField, setCopyingField] = useState<string | null>(null)
  const [targetSectionId, setTargetSectionId] = useState('')
  const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null)
  const [showDeleteFieldConfirm, setShowDeleteFieldConfirm] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<{ field: Field; sectionId: string } | null>(null)

  // Helper function to translate field types
  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'input': return t('layouts.fieldTypeInput')
      case 'description': return t('layouts.fieldTypeDescription')
      case 'dropdown': return t('layouts.fieldTypeDropdown')
      case 'checkboxes': return t('layouts.fieldTypeCheckboxes')
      case 'number': return t('layouts.number')
      case 'email': return t('layouts.email')
      case 'phone': return t('layouts.phone')
      case 'date': return t('layouts.date')
      default: return type
    }
  }

  // Fetch layout from API
  useEffect(() => {
    const fetchLayout = async () => {
      if (!actualLayoutId) {
        setError(t('layouts.noLayoutId'))
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        console.log('🔄 LayoutDesignerPage: Fetching layout with direct Supabase call...', actualLayoutId)
        const startTime = performance.now()
        
        // Use direct Supabase call for instant loading
        const layoutData = await fetchLayoutDeep(actualLayoutId)
        
        const endTime = performance.now()
        console.log(`⚡ LayoutDesignerPage: Layout loaded in ${(endTime - startTime).toFixed(2)}ms`)
        
        // Transform database format to component format
        const transformedLayout = {
          ...layoutData,
          isDefault: layoutData.is_default,
          sections: layoutData.sections?.map(section => ({
            id: section.id,
            title: section.title,
            fields: section.fields?.map(field => ({
              id: field.id,
              label: field.label,
              type: field.type as FieldType,
              placeholder: field.placeholder || undefined,
              required: field.required,
              options: field.options?.map(option => ({
                id: option.id,
                label: option.label,
                value: option.value
              }))
            })) || []
          })) || [],
          createdAt: layoutData.created_at,
          updatedAt: layoutData.updated_at
        }
        
        console.log('✅ LayoutDesignerPage: Layout loaded instantly with sections:', transformedLayout.sections?.length || 0)
        setLayout(transformedLayout)
        setCurrentLayoutName(transformedLayout.name)
      } catch (err) {
        console.error('❌ LayoutDesignerPage: Error fetching layout:', err)
        setError(t('layouts.failedToFetchLayout'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchLayout()
  }, [actualLayoutId])

  // Cleanup: clear layout name when leaving the page
  useEffect(() => {
    return () => {
      setCurrentLayoutName(null)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-900 dark:text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !layout) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-900 dark:text-slate-100">
        <div className="text-center bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {error || t('layouts.layoutNotFound')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {error || t('layouts.layoutNotFoundDescription')}
          </p>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => navigate('/layouts')} 
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              {t('layouts.backToLayouts')}
            </button>
            <button 
              onClick={() => window.location.href = window.location.href} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('layouts.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleAddSection = async () => {
    try {
      const newSection = {
        title: t('layouts.newSection'),
        fields: []
      }
      
      const response = await api.post(`/layouts/${layout.id}/sections`, newSection)
      setLayout({
        ...layout,
        sections: [...layout.sections, response.data]
      })
    } catch (err) {
      setError(t('layouts.failedToAddSection'))
      console.error('Error adding section:', err)
    }
  }

  const fetchAvailableLayouts = async () => {
    try {
      console.log('🌐 Fetching available layouts with direct Supabase call...')
      const layoutsData = await fetchLayouts()
      
      // Transform and filter out the current layout
      const transformedLayouts = layoutsData
        .filter(l => l.id !== layout?.id)
        .map(layout => ({
          ...layout,
          isDefault: layout.is_default,
          sections: [], // Not needed for copy functionality
          createdAt: layout.created_at,
          updatedAt: layout.updated_at
        }))
      
      setAvailableLayouts(transformedLayouts)
      console.log('✅ Available layouts loaded instantly:', transformedLayouts.length)
    } catch (err) {
      console.error('❌ Error fetching layouts:', err)
    }
  }

  const fetchAllLayouts = async () => {
    try {
      console.log('🌐 Fetching all layouts with direct Supabase call...')
      const layoutsData = await fetchLayouts()
      
      // Transform layouts (include all layouts for field copying)
      const transformedLayouts = layoutsData.map(layout => ({
        ...layout,
        isDefault: layout.is_default,
        sections: [], // Not needed for copy functionality
        createdAt: layout.created_at,
        updatedAt: layout.updated_at
      }))
      
      setAvailableLayouts(transformedLayouts)
      console.log('✅ All layouts loaded instantly:', transformedLayouts.length)
    } catch (err) {
      console.error('❌ Error fetching layouts:', err)
    }
  }

  const handleAddField = async (sectionId: string, fieldType: FieldType) => {
    interface FieldDefaults {
      label: string
      placeholder?: string
      options?: { label: string; value: string }[]
    }
    
    const fieldDefaults: Record<FieldType, FieldDefaults> = {
      input: { label: t('layouts.textInput'), placeholder: t('layouts.enterText') },
      description: { label: t('layouts.description'), placeholder: t('layouts.enterDescription') },
      dropdown: { label: t('layouts.dropdown'), placeholder: t('layouts.selectOption'), options: [{ label: t('layouts.option1'), value: t('layouts.option1Value') }] },
      checkboxes: { label: t('layouts.checkboxes'), options: [{ label: t('layouts.option1'), value: t('layouts.option1Value') }] }
    }

    const defaults = fieldDefaults[fieldType]
    try {
      const newField = {
        label: defaults.label,
        type: fieldType,
        placeholder: defaults.placeholder || '',
        required: false,
        options: defaults.options
      }
      
      const response = await api.post(`/layouts/${layout.id}/sections/${sectionId}/fields`, newField)
      setLayout({
        ...layout,
        sections: layout.sections.map(section => 
          section.id === sectionId 
            ? { ...section, fields: [...section.fields, response.data] }
            : section
        )
      })
    } catch (err) {
      setError('Failed to add field')
      console.error('Error adding field:', err)
    }
  }

  const handleEditSection = (section: Section) => {
    setEditingSection(section.id)
    setSectionTitle(section.title)
    setShowEditSectionModal(true)
  }

  const handleSaveSection = async (sectionId: string) => {
    if (sectionTitle.trim()) {
      try {
        await api.patch(`/layouts/${layout.id}/sections/${sectionId}`, { 
          title: sectionTitle.trim() 
        })
        setLayout({
          ...layout,
          sections: layout.sections.map(section => 
            section.id === sectionId 
              ? { ...section, title: sectionTitle.trim() }
              : section
          )
        })
        setEditingSection(null)
        setSectionTitle('')
        setShowEditSectionModal(false)
      } catch (err) {
        setError('Failed to update section')
        console.error('Error updating section:', err)
      }
    }
  }

  const handleCancelEditSection = () => {
    setEditingSection(null)
    setSectionTitle('')
    setShowEditSectionModal(false)
  }

  const handleEditField = (field: Field) => {
    setEditingField(field.id)
    setFieldData({
      label: field.label,
      type: field.type,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options
    })
  }

  const handleSaveField = async (sectionId: string, fieldId: string) => {
    if (fieldData.label?.trim()) {
      try {
        const updateData: Partial<Omit<Field, 'id'>> = {
          label: fieldData.label.trim(),
          type: fieldData.type,
          placeholder: fieldData.placeholder,
          required: fieldData.required
        }
        
        // For fields with options, we need to add the options
        if ((fieldData.type === 'dropdown' || fieldData.type === 'checkboxes') && fieldData.options) {
          // Convert options to have IDs if they don't already
          updateData.options = fieldData.options.map((option, index) => ({
            id: `opt_${Date.now()}_${index}`, // More unique ID generation for options
            label: option.label,
            value: option.value
          }))
        }
        
        await api.patch(`/layouts/${layout.id}/sections/${sectionId}/fields/${fieldId}`, updateData)
        setLayout({
          ...layout,
          sections: layout.sections.map(section => 
            section.id === sectionId 
              ? {
                  ...section,
                  fields: section.fields.map(field => 
                    field.id === fieldId 
                      ? { ...field, ...updateData }
                      : field
                  )
                }
              : section
          )
        })
        setEditingField(null)
        setFieldData({})
      } catch (err) {
        setError('Failed to update field')
        console.error('Error updating field:', err)
      }
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    const section = layout.sections.find(s => s.id === sectionId)
    if (!section) return

    setSectionToDelete(section)
    setShowDeleteSectionConfirm(true)
  }

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return

    try {
      await api.delete(`/layouts/${layout.id}/sections/${sectionToDelete.id}`)
      setLayout({
        ...layout,
        sections: layout.sections.filter(section => section.id !== sectionToDelete.id)
      })
      setShowDeleteSectionConfirm(false)
      setSectionToDelete(null)
    } catch (err) {
      setError('Failed to delete section')
      console.error('Error deleting section:', err)
      setShowDeleteSectionConfirm(false)
      setSectionToDelete(null)
    }
  }

  const handleCancelDeleteSection = () => {
    setShowDeleteSectionConfirm(false)
    setSectionToDelete(null)
  }

  const handleDeleteField = async (sectionId: string, fieldId: string) => {
    const section = layout.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field || !section) return

    setFieldToDelete({ field, sectionId })
    setShowDeleteFieldConfirm(true)
  }

  const handleConfirmDeleteField = async () => {
    if (!fieldToDelete) return

    try {
      await api.delete(`/layouts/${layout.id}/sections/${fieldToDelete.sectionId}/fields/${fieldToDelete.field.id}`)
      setLayout({
        ...layout,
        sections: layout.sections.map(section => 
          section.id === fieldToDelete.sectionId 
            ? {
                ...section,
                fields: section.fields.filter(field => field.id !== fieldToDelete.field.id)
              }
            : section
        )
      })
      setShowDeleteFieldConfirm(false)
      setFieldToDelete(null)
    } catch (err) {
      setError('Failed to delete field')
      console.error('Error deleting field:', err)
      setShowDeleteFieldConfirm(false)
      setFieldToDelete(null)
    }
  }

  const handleCancelDeleteField = () => {
    setShowDeleteFieldConfirm(false)
    setFieldToDelete(null)
  }

  const handleCopySection = async (sectionId: string) => {
    setCopyingSection(sectionId)
    await fetchAvailableLayouts()
  }

  const executeCopySection = async () => {
    if (!copyingSection || !targetLayoutId) return
    
    try {
      const sectionToCopy = layout.sections.find(s => s.id === copyingSection)
      if (!sectionToCopy) return

      // Step 1: Create the section
      const sectionData = {
        title: `${sectionToCopy.title} (Copy)`
      }

      const sectionResponse = await api.post(`/layouts/${targetLayoutId}/sections`, sectionData)
      const newSectionId = sectionResponse.data.id

      // Step 2: Create each field in the new section
      for (const field of sectionToCopy.fields) {
        const fieldData = {
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options || []
        }

        await api.post(`/layouts/${targetLayoutId}/sections/${newSectionId}/fields`, fieldData)
      }
      
      // Reset state
      setCopyingSection(null)
      setTargetLayoutId('')
      setAvailableLayouts([])
      
      alert('Section copied successfully with all fields and options!')
    } catch (err) {
      console.error('Error copying section:', err)
      alert('Failed to copy section')
    }
  }

  const handleCopyField = async (fieldId: string) => {
    setCopyingField(fieldId)
    await fetchAllLayouts()
  }

  const executeCopyField = async () => {
    if (!copyingField || !targetLayoutId || !targetSectionId) return
    
    try {
      // Find the field to copy
      let fieldToCopy: Field | undefined
      for (const section of layout.sections) {
        fieldToCopy = section.fields.find(f => f.id === copyingField)
        if (fieldToCopy) break
      }
      
      if (!fieldToCopy) return

      const fieldData = {
        label: `${fieldToCopy.label} (Copy)`,
        type: fieldToCopy.type,
        placeholder: fieldToCopy.placeholder,
        required: fieldToCopy.required,
        options: fieldToCopy.options || []
      }

      await api.post(`/layouts/${targetLayoutId}/sections/${targetSectionId}/fields`, fieldData)
      
      // Reset state
      setCopyingField(null)
      setTargetLayoutId('')
      setTargetSectionId('')
      setAvailableLayouts([])
      
      alert('Field copied successfully with all options!')
    } catch (err) {
      console.error('Error copying field:', err)
      alert('Failed to copy field')
    }
  }

  const addOption = () => {
    const defaultValue = ''
    const defaultLabel = ''
    const newOptions = [...(fieldData.options || []), { label: defaultLabel, value: defaultValue }]
    setFieldData({ ...fieldData, options: newOptions })
  }

  const updateOption = (index: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...(fieldData.options || [])]
    newOptions[index] = { ...newOptions[index], [field]: value }
    
    // If updating the label, automatically generate the value from the label
    if (field === 'label') {
      newOptions[index].value = value.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    }
    
    setFieldData({ ...fieldData, options: newOptions })
  }

  const removeOption = (index: number) => {
    const newOptions = fieldData.options?.filter((_, i) => i !== index) || []
    setFieldData({ ...fieldData, options: newOptions })
  }

  const handleSaveLayout = async () => {
    try {
      // The layout is automatically saved when sections/fields are modified
      // This function can be used for any final save operations if needed
      console.log('Layout saved successfully')
      
      // Navigate back to layouts page
      navigate('/layouts')
    } catch (err) {
      console.error('Error saving layout:', err)
      alert('Failed to save layout')
    }
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="p-6 hidden lg:block">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="hidden md:block">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
                {layout.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                {layout.sections.length} {t('layouts.sections')} • {layout.sections.reduce((acc, section) => acc + section.fields.length, 0)} {t('layouts.fields')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAddSection}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                {t('layouts.addSection')}
              </button>
              <button 
                onClick={handleSaveLayout}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {t('layouts.saveLayout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Buttons */}
      <div className="lg:hidden p-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            onClick={handleAddSection}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            {t('layouts.addSection')}
          </button>
          <button 
            onClick={handleSaveLayout}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            {t('layouts.saveLayout')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {layout.sections.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <DocumentTextIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{t('layouts.startBuilding')}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              {t('layouts.startBuildingDescription')} 
              Organize your content with logical groupings to create professional, structured invoices.
            </p>
            <button 
              onClick={handleAddSection}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-3"
            >
              <PlusIcon className="w-6 h-6" />
              Add Your First Section
            </button>
            
            {/* Additional helpful info */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                💡 <strong>Pro tip:</strong> Structure your layout with sections like:
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <RectangleGroupIcon className="w-4 h-4 text-blue-500" />
                  <span>{t('layouts.clientInformation')}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <DocumentTextIcon className="w-4 h-4 text-blue-500" />
                  <span>{t('layouts.projectDetails')}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                  <span>{t('layouts.paymentTerms')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {layout.sections.map((section) => (
              <div key={section.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                
                {/* Section Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{section.title}</h2>
                      <button
                        onClick={() => handleEditSection(section)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {t('layouts.fieldCount', { count: section.fields.length, plural: section.fields.length !== 1 ? 's' : '' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <button className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors">
                          <PlusIcon className="w-4 h-4" />
                        </button>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <button
                              onClick={() => handleAddField(section.id, 'input')}
                              className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('layouts.textInput')}
                            </button>
                            <button
                              onClick={() => handleAddField(section.id, 'description')}
                              className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('layouts.textarea')}
                            </button>
                            <button
                              onClick={() => handleAddField(section.id, 'dropdown')}
                              className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('layouts.dropdown')}
                            </button>
                            <button
                              onClick={() => handleAddField(section.id, 'checkboxes')}
                              className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('layouts.checkboxes')}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopySection(section.id)}
                          className="p-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
                          title="Copy section to another layout"
                        >
                          <Square2StackIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                  </div>
                </div>

                {/* Section Content */}
                <div className="p-6">
                  {section.fields.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
                      <RectangleGroupIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 mb-4">{t('layouts.noFieldsInSection')}</p>
                      <button
                        onClick={() => handleAddField(section.id, 'input')}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Add Your First Field
                      </button>
                    </div>
                  ) : (
                    <div className="columns-1 lg:columns-2 gap-6 space-y-6">
                      {section.fields.map((field) => (
                        <div key={field.id} className="group relative break-inside-avoid mb-6">
                          
                          {/* Field Editing Modal */}
                          {editingField === field.id && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('layouts.editField')}</h3>
                                    <button
                                      onClick={() => {
                                        setEditingField(null)
                                        setFieldData({})
                                      }}
                                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                                    >
                                      <XMarkIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('layouts.fieldLabel')}</label>
                                    <input
                                      type="text"
                                      value={fieldData.label || ''}
                                      onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
                                      placeholder={t('layouts.fieldLabelHint')}
                                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('layouts.fieldType')}</label>
                                    <select
                                      value={fieldData.type || ''}
                                      onChange={(e) => setFieldData({ ...fieldData, type: e.target.value as FieldType })}
                                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                      <option value="input">{t('layouts.text')}</option>
                                      <option value="description">{t('layouts.textarea')}</option>
                                      <option value="dropdown">{t('layouts.dropdown')}</option>
                                      <option value="checkboxes">{t('layouts.checkboxes')}</option>
                                    </select>
                                  </div>
                                  
                                  {(fieldData.type === 'input' || fieldData.type === 'description') && (
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('layouts.fieldPlaceholder')}</label>
                                      <input
                                        type="text"
                                        value={fieldData.placeholder || ''}
                                        onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })}
                                        placeholder={t('layouts.fieldPlaceholderHint')}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={fieldData.required || false}
                                      onChange={(e) => setFieldData({ ...fieldData, required: e.target.checked })}
                                      className="mr-2 w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                                    />
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('layouts.required')}</label>
                                  </div>
                                  
                                  {(fieldData.type === 'dropdown' || fieldData.type === 'checkboxes') && (
                                    <div>
                                      <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                          {t('layouts.options')}
                                        </label>
                                        <button
                                          onClick={addOption}
                                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                                        >
                                          {t('layouts.addOption')}
                                        </button>
                                      </div>
                                      <div className="space-y-2">
                                        {fieldData.options?.map((option, index) => (
                                          <div key={index} className="flex gap-2">
                                            <input
                                              type="text"
                                              placeholder={t('layouts.optionLabel')}
                                              value={option.label}
                                              onChange={(e) => updateOption(index, 'label', e.target.value)}
                                              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                            <button
                                              onClick={() => removeOption(index)}
                                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                  <button
                                    onClick={() => {
                                      setEditingField(null)
                                      setFieldData({})
                                    }}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                  >
                                    {t('common.cancel')}
                                  </button>
                                  <button
                                    onClick={() => handleSaveField(section.id, field.id)}
                                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                                  >
                                    {t('layouts.saveChanges')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Field Card */}
                          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-6 border border-slate-200 dark:border-slate-600 transition-all duration-200 relative">
                            
                            {/* Field Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <label className="font-semibold text-slate-900 dark:text-slate-100">
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                field.type === 'input' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' :
                                field.type === 'description' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700' :
                                field.type === 'dropdown' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' :
                                field.type === 'checkboxes' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700' :
                                'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-500'
                              }`}>
                                {getFieldTypeLabel(field.type)}
                              </span>
                            </div>
                            
                            {/* Field Preview */}
                            {field.type === 'input' && (
                              <input
                                type="text"
                                placeholder={field.placeholder}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                disabled
                              />
                            )}
                            
                            {field.type === 'description' && (
                              <textarea
                                placeholder={field.placeholder}
                                rows={3}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                disabled
                              />
                            )}
                            
                            {field.type === 'dropdown' && (
                              <select 
                                className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                                disabled
                              >
                                <option>Select an option...</option>
                                {field.options?.map((option) => (
                                  <option key={option.id} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            )}
                            
                            {field.type === 'checkboxes' && (
                              <div className="space-y-2">
                                {field.options?.map((option) => (
                                  <label key={option.id} className="flex items-center gap-2">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded focus:ring-blue-500" 
                                      disabled 
                                    />
                                    <span className="text-slate-700 dark:text-slate-300">{option.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {/* Field Actions */}
                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                              <button
                                onClick={() => handleEditField(field)}
                                className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
                                title="Edit field"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopyField(field.id)}
                                className="p-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
                                title="Copy field to another section"
                              >
                                <Square2StackIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteField(section.id, field.id)}
                                className="p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition-colors"
                                title="Delete field"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Add Section Button */}
            <div className="text-center">
              <button 
                onClick={handleAddSection}
                className="px-8 py-4 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('layouts.addAnotherSection')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Copy Section Modal */}
      {copyingSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('layouts.copySection')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {t('layouts.chooseLayoutToCopySection')}
              </p>
              
              <div className="space-y-2 mb-6">
                {availableLayouts.map((layout) => (
                  <label
                    key={layout.id}
                    className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="targetLayout"
                      value={layout.id}
                      checked={targetLayoutId === layout.id}
                      onChange={(e) => setTargetLayoutId(e.target.value)}
                      className="text-blue-500"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {layout.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {layout.sections.length} sections
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setCopyingSection(null)
                    setTargetLayoutId('')
                    setAvailableLayouts([])
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={executeCopySection}
                  disabled={!targetLayoutId}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {t('layouts.copySection')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Field Modal */}
      {copyingField && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('layouts.copyField')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {t('layouts.chooseSectionToCopyField')}
              </p>
              
              {/* Layout Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('layouts.targetLayout')}
                </label>
                <select
                  value={targetLayoutId}
                  onChange={(e) => {
                    setTargetLayoutId(e.target.value)
                    setTargetSectionId('') // Reset section when layout changes
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">{t('layouts.selectLayout')}</option>
                  {availableLayouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Selection */}
              {targetLayoutId && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('layouts.targetSection')}
                  </label>
                  <select
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">{t('layouts.selectSection')}</option>
                    {availableLayouts
                      .find(l => l.id === targetLayoutId)
                      ?.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title} ({section.fields.length} {t('layouts.fields')})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setCopyingField(null)
                    setTargetLayoutId('')
                    setTargetSectionId('')
                    setAvailableLayouts([])
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={executeCopyField}
                  disabled={!targetLayoutId || !targetSectionId}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {t('layouts.copyField')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Name Modal */}
      {showEditSectionModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">{t('layouts.editSection')}</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('layouts.sectionTitle')}
                </label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingSection) {
                      handleSaveSection(editingSection)
                    } else if (e.key === 'Escape') {
                      handleCancelEditSection()
                    }
                  }}
                  placeholder={t('layouts.sectionTitlePlaceholder')}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelEditSection}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => editingSection && handleSaveSection(editingSection)}
                  disabled={!sectionTitle.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200"
                >
                  {t('layouts.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Confirmation Modal */}
      {showDeleteSectionConfirm && sectionToDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {t('layouts.deleteSection')}
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  {t('layouts.deleteSectionConfirm', { sectionTitle: sectionToDelete.title })}
                </p>
                
                {sectionToDelete.fields.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      {t('layouts.fieldsThatWillBeDeleted')} ({sectionToDelete.fields.length}):
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {sectionToDelete.fields.map((field, index) => (
                        <div key={field.id || index} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded text-sm">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{field.label}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                            field.type === 'input' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            field.type === 'description' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                            field.type === 'dropdown' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            field.type === 'checkboxes' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                            'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                          }`}>
                            {getFieldTypeLabel(field.type)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {t('layouts.deleteSectionWarning', {
                    count: sectionToDelete.fields.length,
                    plural: sectionToDelete.fields.length !== 1 ? 's' : ''
                  })}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDeleteSection}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmDeleteSection}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {t('layouts.deleteSection')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Field Confirmation Modal */}
      {showDeleteFieldConfirm && fieldToDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {t('layouts.deleteField')}
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  {t('layouts.deleteFieldConfirm', { fieldLabel: fieldToDelete.field.label })}
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t('layouts.fieldDetails')}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{t('layouts.fieldTypeLabel')}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                        fieldToDelete.field.type === 'input' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        fieldToDelete.field.type === 'description' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                        fieldToDelete.field.type === 'dropdown' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        fieldToDelete.field.type === 'checkboxes' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                        'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      }`}>
                        {getFieldTypeLabel(fieldToDelete.field.type)}
                      </span>
                    </div>
                    
                    {fieldToDelete.field.required && (
                      <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{t('layouts.required')}</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          Yes
                        </span>
                      </div>
                    )}
                    
                    {fieldToDelete.field.placeholder && (
                      <div className="flex items-start justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{t('layouts.fieldPlaceholderLabel')}</span>
                        <span className="text-sm text-slate-900 dark:text-slate-100 text-right max-w-[200px] break-words">
                          "{fieldToDelete.field.placeholder}"
                        </span>
                      </div>
                    )}
                    
                    {fieldToDelete.field.options && fieldToDelete.field.options.length > 0 && (
                      <div className="py-2 px-3 bg-white dark:bg-slate-600 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Options:</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {fieldToDelete.field.options.length} option{fieldToDelete.field.options.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {fieldToDelete.field.options.map((option, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                              {option.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {t('layouts.actionCannotBeUndone')}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDeleteField}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmDeleteField}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {t('layouts.deleteField')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
