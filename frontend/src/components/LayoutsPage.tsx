import { Link } from 'react-router-dom'
import ActionIf from './ActionIf'
import {
  PlusIcon,
  DocumentTextIcon,
  RectangleStackIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  Square2StackIcon,
  TrashIcon,
  Squares2X2Icon,
  NumberedListIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { fetchLayouts, saveLayout, updateLayout, deleteLayout, removeDefaultLayout, setDefaultLayout, type LayoutWithCounts } from '../lib/api'

export default function LayoutsPage() {
  const [layouts, setLayouts] = useState<LayoutWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingLayout, setEditingLayout] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLayoutName, setNewLayoutName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [layoutToDelete, setLayoutToDelete] = useState<LayoutWithCounts | null>(null)
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{
    invoiceCount: number
    availableLayouts: Array<{id: string, name: string}>
  } | null>(null)
  const [reassignLayoutId, setReassignLayoutId] = useState('')
  const [showSimpleDeleteConfirm, setShowSimpleDeleteConfirm] = useState(false)
  const [layoutToSimpleDelete, setLayoutToSimpleDelete] = useState<LayoutWithCounts | null>(null)

  // Fetch layouts from Supabase
  useEffect(() => {
    const loadLayouts = async () => {
      try {
        console.log('📡 Starting loadLayouts...')
        setLoading(true)
        setError('')
        
        console.log('🌐 Making direct Supabase call to layouts...')
        const layoutsData = await fetchLayouts()
        
        console.log('✅ Layouts loaded successfully:', layoutsData)
        console.log('📊 Layouts count:', layoutsData?.length || 0)
        setLayouts(layoutsData || [])
      } catch (err: any) {
        setError('Failed to fetch layouts')
        console.error('❌ Error fetching layouts:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLayouts()
  }, [])

  const handleDelete = async (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    if (!layout) return

    // Show simple confirmation dialog first
    setLayoutToSimpleDelete(layout)
    setShowSimpleDeleteConfirm(true)
  }

  const handleConfirmSimpleDelete = async () => {
    if (!layoutToSimpleDelete) return

    try {
      console.log('🗑️ Attempting to delete layout:', layoutToSimpleDelete.id)
      await deleteLayout(layoutToSimpleDelete.id)
      
      setLayouts(layouts.filter(layout => layout.id !== layoutToSimpleDelete.id))
      setShowSimpleDeleteConfirm(false)
      setLayoutToSimpleDelete(null)
      console.log('✅ Layout deleted successfully')
    } catch (err: any) {
      console.error('❌ Error deleting layout:', err)
      
      // Check if it's a foreign key constraint error
      if (err.error === 'layout_in_use') {
        // Close simple confirm and show complex confirm
        setShowSimpleDeleteConfirm(false)
        setLayoutToDelete(layoutToSimpleDelete)
        setDeleteConfirmInfo({
          invoiceCount: err.invoiceCount,
          availableLayouts: err.availableLayouts || []
        })
        setShowDeleteConfirm(true)
        setReassignLayoutId('')
        setLayoutToSimpleDelete(null)
      } else {
        setError('Failed to delete layout: ' + (err.message || 'Unknown error'))
        setShowSimpleDeleteConfirm(false)
        setLayoutToSimpleDelete(null)
      }
    }
  }

  const handleCancelSimpleDelete = () => {
    setShowSimpleDeleteConfirm(false)
    setLayoutToSimpleDelete(null)
  }

  const handleConfirmDelete = async (forceDelete: boolean = false) => {
    if (!layoutToDelete) return

    try {
      console.log('🗑️ Confirming layout deletion:', {
        layoutId: layoutToDelete.id,
        forceDelete,
        reassignTo: reassignLayoutId
      })

      const options: { force?: boolean; reassignTo?: string } = {}
      
      if (forceDelete) {
        options.force = true
      } else if (reassignLayoutId) {
        options.reassignTo = reassignLayoutId
      }

      await deleteLayout(layoutToDelete.id, options)
      
      setLayouts(layouts.filter(layout => layout.id !== layoutToDelete.id))
      setShowDeleteConfirm(false)
      setLayoutToDelete(null)
      setDeleteConfirmInfo(null)
      setReassignLayoutId('')
      console.log('✅ Layout deleted successfully')
    } catch (err: any) {
      console.error('❌ Error deleting layout:', err)
      setError('Failed to delete layout: ' + (err.message || 'Unknown error'))
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setLayoutToDelete(null)
    setDeleteConfirmInfo(null)
    setReassignLayoutId('')
  }

  const handleSetDefault = async (layoutId: string) => {
    try {
      console.log('⭐ Setting default layout:', layoutId)
      await setDefaultLayout(layoutId)
      
      setLayouts(layouts.map(layout => ({
        ...layout,
        is_default: layout.id === layoutId
      })))
      console.log('✅ Default layout set successfully')
    } catch (err: any) {
      setError('Failed to set default layout')
      console.error('❌ Error setting default layout:', err)
    }
  }

  const handleRemoveDefault = async (layoutId: string) => {
    try {
      console.log('🚫 Removing default status from layout:', layoutId)
      await removeDefaultLayout(layoutId)
      
      setLayouts(layouts.map(layout => ({
        ...layout,
        is_default: layout.id === layoutId ? false : layout.is_default
      })))
      console.log('✅ Default status removed successfully')
    } catch (err: any) {
      setError('Failed to remove default status')
      console.error('❌ Error removing default status:', err)
    }
  }

  const handleDuplicate = async (layout: LayoutWithCounts) => {
    try {
      console.log('📋 Duplicating layout:', layout.id)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, user_id, created_at, updated_at, ...duplicateData } = layout
      const newLayoutData = {
        ...duplicateData,
        name: `${layout.name} (Copy)`,
        is_default: false
      }
      
      const newLayout = await saveLayout(newLayoutData)
      console.log('✅ Layout duplicated successfully:', newLayout)
      setLayouts([...layouts, newLayout])
    } catch (err: any) {
      setError('Failed to duplicate layout')
      console.error('❌ Error duplicating layout:', err)
    }
  }

  const handleCreateNew = () => {
    setNewLayoutName('')
    setShowCreateModal(true)
  }

  const handleCreateModalSave = async () => {
    if (newLayoutName?.trim()) {
      try {
        console.log('🆕 Creating new layout:', newLayoutName.trim())
        const newLayoutData = {
          name: newLayoutName.trim(),
          is_default: false
        }
        
        const newLayout = await saveLayout(newLayoutData)
        console.log('✅ Layout created successfully:', newLayout)
        setLayouts([...layouts, newLayout])
        setShowCreateModal(false)
        setNewLayoutName('')
      } catch (err: any) {
        setError('Failed to create layout')
        console.error('❌ Error creating layout:', err)
      }
    }
  }

  const handleCreateModalCancel = () => {
    setShowCreateModal(false)
    setNewLayoutName('')
  }

  const handleStartRename = (layout: LayoutWithCounts) => {
    setEditingLayout(layout.id)
    setEditName(layout.name)
    setShowEditModal(true)
  }

  const handleSaveRename = async (layoutId: string) => {
    if (editName.trim()) {
      try {
        console.log('✏️ Renaming layout:', layoutId, editName.trim())
        await updateLayout(layoutId, { name: editName.trim() })
        
        setLayouts(layouts.map(layout => 
          layout.id === layoutId 
            ? { ...layout, name: editName.trim() }
            : layout
        ))
        setEditingLayout(null)
        setEditName('')
        setShowEditModal(false)
        console.log('✅ Layout renamed successfully')
      } catch (err: any) {
        setError('Failed to rename layout')
        console.error('❌ Error renaming layout:', err)
      }
    }
  }

  const handleCancelRename = () => {
    setEditingLayout(null)
    setEditName('')
    setShowEditModal(false)
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="hidden md:block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
              Invoice Layouts
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              Design and manage your invoice templates with ease
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            Create New Layout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <RectangleGroupIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Layouts</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{layouts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <RectangleStackIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Sections</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {layouts.reduce((total, layout) => total + (layout.layout_sections?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Squares2X2Icon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Fields</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {layouts.reduce((total, layout) => 
                    total + (layout.layout_sections?.reduce((sectionTotal, section) => 
                      sectionTotal + (section.layout_fields?.length || 0), 0) || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <NumberedListIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Options</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {layouts.reduce((total, layout) => 
                    total + (layout.layout_sections?.reduce((sectionTotal, section) => 
                      sectionTotal + (section.layout_fields?.reduce((fieldTotal, field) => 
                        fieldTotal + (field.layout_field_options?.length || 0), 0) || 0), 0) || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Layouts Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-slate-500 dark:text-slate-400 text-lg">Loading layouts...</span>
            </div>
          </div>
        ) : layouts.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <DocumentTextIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">No Invoice Layouts Yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Invoice layouts are templates that define the structure and fields of your invoices. 
              Create your first layout to start designing professional invoices with custom fields and sections.
            </p>
            <ActionIf ability="layouts.create">
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-3"
              >
                <PlusIcon className="w-6 h-6" />
                Create Your First Layout
              </button>
            </ActionIf>
            
            {/* Additional helpful info */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                💡 <strong>Pro tip:</strong> Layouts help you:
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <RectangleStackIcon className="w-4 h-4 text-blue-500" />
                  <span>Organize invoice fields</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <DocumentTextIcon className="w-4 h-4 text-blue-500" />
                  <span>Create consistent templates</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                  <span>Save time on invoices</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layouts.map((layout) => (
              <div key={layout.id} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                
                {/* Default Badge - Top Right Corner */}
                {layout.is_default && editingLayout !== layout.id && (
                  <span className="absolute top-4 right-4 inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    DEFAULT
                  </span>
                )}
                
                {/* Layout Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-16">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {layout.name}
                      </h3>
                      <button
                        onClick={() => handleStartRename(layout)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Layout Stats */}
                <div className="flex items-center gap-4 mb-6 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <RectangleStackIcon className="w-4 h-4" />
                    <span>Sections: {layout.layout_sections?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Squares2X2Icon className="w-4 h-4 text-slate-500" />
                    <span>Fields: {layout.layout_sections?.reduce((total, section) => total + (section.layout_fields?.length || 0), 0) || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <NumberedListIcon className="w-4 h-4 text-slate-500" />
                    <span>Options: {layout.layout_sections?.reduce((total, section) => 
                      total + (section.layout_fields?.reduce((fieldTotal, field) => 
                        fieldTotal + (field.layout_field_options?.length || 0), 0) || 0), 0) || 0}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <ActionIf ability="layouts.edit">
                    <Link
                      to={`/layouts/${layout.id}`}
                      className="flex-1 min-w-0 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all duration-200 text-center"
                    >
                      Edit
                    </Link>
                  </ActionIf>
                  
                  <ActionIf ability="layouts.create">
                    <button
                      onClick={() => handleDuplicate(layout)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-all duration-200"
                      title="Duplicate"
                    >
                      <Square2StackIcon className="w-4 h-4 text-slate-500" />
                    </button>
                  </ActionIf>
                  
                  {!layout.is_default ? (
                    <ActionIf ability="layouts.edit">
                      <button
                        onClick={() => handleSetDefault(layout.id)}
                        className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-xl transition-all duration-200"
                        title="Set as Default"
                      >
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      </button>
                    </ActionIf>
                  ) : (
                    <ActionIf ability="layouts.edit">
                      <button
                        onClick={() => handleRemoveDefault(layout.id)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-all duration-200"
                        title="Remove Default"
                      >
                        <CheckCircleIcon className="w-4 h-4 text-slate-400" />
                      </button>
                    </ActionIf>
                  )}
                  
                  <ActionIf ability="layouts.delete">
                    <button
                      onClick={() => handleDelete(layout.id)}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-sm font-medium rounded-xl transition-all duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </ActionIf>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Layout Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Create New Layout</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Layout Name
                </label>
                <input
                  type="text"
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateModalSave()
                    } else if (e.key === 'Escape') {
                      handleCreateModalCancel()
                    }
                  }}
                  placeholder="Enter layout name..."
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCreateModalCancel}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateModalSave}
                  disabled={!newLayoutName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200"
                >
                  Create Layout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Layout Name Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Edit Layout Name</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Layout Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingLayout) {
                      handleSaveRename(editingLayout)
                    } else if (e.key === 'Escape') {
                      handleCancelRename()
                    }
                  }}
                  placeholder="Enter layout name..."
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelRename}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editingLayout && handleSaveRename(editingLayout)}
                  disabled={!editName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Delete Confirmation Modal */}
      {showSimpleDeleteConfirm && layoutToSimpleDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Delete Layout
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  Are you sure you want to delete the layout "<strong>{layoutToSimpleDelete.name}</strong>"?
                </p>
                
                {/* Layout Summary */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Layout Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Sections:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{layoutToSimpleDelete.layout_sections?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Fields:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {layoutToSimpleDelete.layout_sections?.reduce((total, section) => total + (section.layout_fields?.length || 0), 0) || 0}
                      </span>
                    </div>
                    {layoutToSimpleDelete.is_default && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Status:</span>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          DEFAULT
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Sections List */}
                  {layoutToSimpleDelete.layout_sections && layoutToSimpleDelete.layout_sections.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-600">
                      <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sections to be deleted:</h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                          {layoutToSimpleDelete.layout_sections.map((section, index) => {
                            const sectionTitle = (section as any)['title'] ?? (section as any)['name'] ?? `Section ${index + 1}`;
                            return (
                              <div key={section.id || index} className="flex items-center justify-between py-1 px-2 bg-white dark:bg-slate-600 rounded text-xs">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{sectionTitle}</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {section.layout_fields?.length || 0} field{(section.layout_fields?.length || 0) !== 1 ? 's' : ''}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelSimpleDelete}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSimpleDelete}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Delete Layout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && layoutToDelete && deleteConfirmInfo && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg relative z-10">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Layout is Being Used
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  The layout "<strong>{layoutToDelete.name}</strong>" cannot be deleted because it is being used by{' '}
                  <strong>{deleteConfirmInfo.invoiceCount}</strong> invoice{deleteConfirmInfo.invoiceCount !== 1 ? 's' : ''}.
                </p>
                
                {deleteConfirmInfo.availableLayouts.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                      You can reassign these invoices to another layout before deleting:
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Reassign invoices to:
                      </label>
                      <select
                        value={reassignLayoutId}
                        onChange={(e) => setReassignLayoutId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="">Select a layout...</option>
                        {deleteConfirmInfo.availableLayouts.map((layout) => (
                          <option key={layout.id} value={layout.id}>
                            {layout.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-3">
                      You have no other layouts to reassign invoices to. 
                    </p>
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      <strong>Force deleting</strong> will remove the layout and set the layout reference in invoices to "No Layout". 
                      The invoices will remain but won't have a specific layout template.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                
                {deleteConfirmInfo.availableLayouts.length > 0 ? (
                  <button
                    onClick={() => handleConfirmDelete(false)}
                    disabled={!reassignLayoutId}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200"
                  >
                    Reassign & Delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleConfirmDelete(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Force Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
