import { useState, useEffect } from 'react'
import ActionIf from './ActionIf'
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  XMarkIcon,
  CubeIcon,
  TagIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  Square3Stack3DIcon
} from '@heroicons/react/24/solid'
import { fetchItems, createItem, updateItem, deleteItem, type ItemRow } from '../lib/api'
import { useTranslation } from '../contexts/LanguageContext'

export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [batchCategoryValue, setBatchCategoryValue] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ItemRow | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [itemData, setItemData] = useState({
    name: '',
    description: '',
    unit_price: 0,
    sku: '',
    category: ''
  })

  const { t } = useTranslation()

  // Fetch items from Supabase
  useEffect(() => {
    const loadItems = async () => {
      try {
        console.log('📡 Starting loadItems...')
        setLoading(true)
        setError(null)
        
        console.log('🌐 Making direct Supabase call to items...')
        const itemsData = await fetchItems()
        
        console.log('✅ Items loaded successfully:', itemsData)
        console.log('📊 Items count:', itemsData?.length || 0)
        setItems(itemsData || [])
        
        // Extract unique categories
        const uniqueCategories: string[] = [...new Set(
          (itemsData || [])
            .map((item: ItemRow) => item.category)
            .filter((category: string | null): category is string => 
              Boolean(category && category.trim())
            )
        )] as string[]
        setCategories(uniqueCategories)
      } catch (err: any) {
        console.error('❌ Error fetching items:', err)
        setError(err.message || t('items.failedToFetchItems'))
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [])

  const handleCreateItem = async () => {
    try {
      console.log('🆕 Creating new item:', itemData)
      const newItem = await createItem(itemData)
      
      console.log('✅ Item created:', newItem)
      setItems(prev => [...prev, newItem])
      
      // Update categories if new category was added
      if (itemData.category && !categories.includes(itemData.category)) {
        setCategories(prev => [...prev, itemData.category])
      }
      
      setShowCreateModal(false)
      resetForm()
    } catch (err: any) {
      console.error('❌ Error creating item:', err)
      setError(err.message || t('items.failedToCreateItem'))
    }
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories(prev => [...prev, newCategoryName.trim()])
      setItemData(prev => ({ ...prev, category: newCategoryName.trim() }))
    }
    setShowCategoryModal(false)
    setNewCategoryName('')
  }

  // Calculate category counts
  const categoryCounts = categories.map(category => ({
    name: category,
    count: items.filter(item => item.category === category).length
  }))

  // Filter items based on selected category and search query
  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  const handleUpdateItem = async (itemId: string) => {
    try {
      console.log('✏️ Updating item:', itemId, itemData)
      const updatedItem = await updateItem(itemId, itemData)
      
      console.log('✅ Item updated:', updatedItem)
      setItems(prev => prev.map(item => 
        item.id === itemId ? updatedItem : item
      ))
      setEditingItem(null)
      resetForm()
    } catch (err: any) {
      console.error('❌ Error updating item:', err)
      setError(err.message || t('items.failedToUpdateItem'))
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setItemToDelete(item)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    try {
      console.log('🗑️ Deleting item:', itemToDelete.id)
      await deleteItem(itemToDelete.id)
      
      // Remove the item from the local state (soft delete sets is_active to false)
      setItems(prev => prev.filter(item => item.id !== itemToDelete.id))
      
      setShowDeleteConfirm(false)
      setItemToDelete(null)
      console.log('✅ Item deleted successfully')
    } catch (err: any) {
      console.error('❌ Error deleting item:', err)
      setError(err.message || t('items.failedToDeleteItem'))
      setShowDeleteConfirm(false)
      setItemToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setItemToDelete(null)
  }

  const handleEditItem = (item: ItemRow) => {
    setEditingItem(item.id)
    setItemData({
      name: item.name,
      description: item.description || '',
      unit_price: item.unit_price,
      sku: item.sku || '',
      category: item.category || ''
    })
  }

  const resetForm = () => {
    setItemData({
      name: '',
      description: '',
      unit_price: 0,
      sku: '',
      category: ''
    })
  }

  const handleCancel = () => {
    setEditingItem(null)
    setShowCreateModal(false)
    resetForm()
  }

  // Batch action handlers
  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)))
    }
  }

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return
    setShowBulkDeleteConfirm(true)
  }

  const handleConfirmBulkDelete = async () => {
    if (selectedItems.size === 0) return

    try {
      const deletePromises = Array.from(selectedItems).map(itemId => deleteItem(itemId))
      await Promise.all(deletePromises)
      
      // Remove deleted items from local state
      setItems(prev => prev.filter(item => !selectedItems.has(item.id)))
      setSelectedItems(new Set())
      setShowBulkDeleteConfirm(false)
      
      console.log('✅ Batch delete completed')
    } catch (err: any) {
      console.error('❌ Error in batch delete:', err)
      setError(err.message || t('items.failedToDeleteItems'))
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleCancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false)
  }

  const handleBatchCategoryChange = async () => {
    if (!batchCategoryValue.trim()) return
    
    try {
      const updatePromises = Array.from(selectedItems).map(itemId => {
        const item = items.find(i => i.id === itemId)
        if (!item) return Promise.resolve()
        
        return updateItem(itemId, {
          name: item.name,
          description: item.description || '',
          unit_price: item.unit_price,
          sku: item.sku || '',
          category: batchCategoryValue
        })
      })
      
      await Promise.all(updatePromises)
      
      // Update items in local state
      setItems(prev => prev.map(item => 
        selectedItems.has(item.id) 
          ? { ...item, category: batchCategoryValue }
          : item
      ))
      
      // Update categories if new category was added
      if (!categories.includes(batchCategoryValue)) {
        setCategories(prev => [...prev, batchCategoryValue])
      }
      
      setSelectedItems(new Set())
      setBatchCategoryValue('')
      
      console.log('✅ Batch category update completed')
    } catch (err: any) {
      console.error('❌ Error in batch category update:', err)
      setError(err.message || t('items.failedToUpdateCategories'))
    }
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="hidden md:block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
              {t('items.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              {t('items.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            {t('items.addNewItem')}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CubeIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('items.totalItems')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{items.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TagIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('items.categories')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{categories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('items.totalValue')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  ${items
                    .filter(item => item.sku && parseFloat(item.sku) > 0)
                    .reduce((sum, item) => sum + (item.unit_price * parseFloat(item.sku || '0')), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Square3Stack3DIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('items.totalSku')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {items.reduce((sum, item) => sum + parseFloat(item.sku || '0'), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedItems.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedItems.size} {t('items.itemsSelected', { plural: selectedItems.size !== 1 ? 's' : '' })}
                </div>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  {t('items.clearSelection')}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <ActionIf ability="items.delete">
                  <button
                    onClick={handleBatchDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    {t('items.deleteSelected')}
                  </button>
                </ActionIf>
                
                <ActionIf ability="items.edit">
                  <div className="flex items-center gap-2">
                    <select
                      value={batchCategoryValue}
                      onChange={(e) => setBatchCategoryValue(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                    >
                      <option value="">{t('items.changeCategory')}</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleBatchCategoryChange}
                      disabled={!batchCategoryValue}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      {t('items.apply')}
                    </button>
                  </div>
                </ActionIf>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={t('items.searchItems')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className={`h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-center relative ${
                        selectedCategory !== 'all' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                      }`}
                      title={t('items.filterByCategory')}
                    >
                      <FunnelIcon className={`w-4 h-4 ${
                        selectedCategory !== 'all' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                      }`} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          {[{ name: 'all', count: items.length }, ...categoryCounts].map(({ name }) => (
                            <button
                              key={name}
                              onClick={() => {
                                setSelectedCategory(name)
                                setShowCategoryDropdown(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${
                                selectedCategory === name 
                                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500' 
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {name === 'all' ? t('items.allCategories') : name.charAt(0).toUpperCase() + name.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {loading ? (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          disabled
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.itemName')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.price')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.sku')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.category')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span>{t('items.loadingItems')}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Hidden on desktop */}
              <div className="md:hidden">
                <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>{t('items.loadingItems')}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.itemName')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.price')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.sku')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.category')}
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {t('items.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          {searchQuery ? (
                            <div>
                              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('items.noItemsFound')}</h3>
                              <p className="text-slate-600 dark:text-slate-400 mb-6">
                                {t('items.noItemsMatch', { query: searchQuery })}
                              </p>
                              <button
                                onClick={() => setSearchQuery('')}
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                              >
                                {t('items.clearSearch')}
                              </button>
                            </div>
                          ) : selectedCategory === 'all' ? (
                            <div className="max-w-md mx-auto">
                              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                                <TagIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('items.noItemsYet')}</h3>
                              <p className="text-slate-600 dark:text-slate-400 mb-6">
                                {t('items.noItemsDescription')}
                              </p>
                              <ActionIf ability="items.create">
                                <button
                                  onClick={() => setShowCreateModal(true)}
                                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                                >
                                  <PlusIcon className="w-5 h-5" />
                                  {t('items.createFirstItem')}
                                </button>
                              </ActionIf>
                            </div>
                          ) : (
                            <div className="max-w-md mx-auto">
                              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                                <FunnelIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('items.noItemsInCategory', { category: selectedCategory })}</h3>
                              <p className="text-slate-600 dark:text-slate-400 mb-6">
                                {t('items.addItemsToCategory', { category: selectedCategory })}
                              </p>
                              <ActionIf ability="items.create">
                                <button
                                  onClick={() => setShowCreateModal(true)}
                                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                                >
                                  <PlusIcon className="w-5 h-5" />
                                  {t('items.addItemToCategory', { category: selectedCategory })}
                                </button>
                              </ActionIf>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="min-w-0 flex-1">
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <span className="text-base font-bold text-green-600 dark:text-green-400">
                            ${item.unit_price}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {item.sku || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          {item.category ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex justify-center items-center space-x-2">
                            <ActionIf ability="items.edit">
                              <button 
                                onClick={() => handleEditItem(item)}
                                className="p-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 group"
                                title={t('items.editItemTitle')}
                              >
                                <PencilSquareIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              </button>
                            </ActionIf>
                            <ActionIf ability="items.delete">
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 group"
                                title={t('items.deleteItemTitle')}
                              >
                                <TrashIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              </button>
                            </ActionIf>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Hidden on desktop */}
              <div className="md:hidden">
                {filteredItems.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    {searchQuery ? (
                      <div>
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('items.noItemsFound')}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          {t('items.noItemsMatch', { query: searchQuery })}
                        </p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                        >
                          {t('items.clearSearch')}
                        </button>
                      </div>
                    ) : selectedCategory === 'all' ? (
                      <div className="max-w-md mx-auto">
                        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                          <TagIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('items.noItemsYet')}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          {t('items.noItemsDescription')}
                        </p>
                        <ActionIf ability="items.create">
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                          >
                            <PlusIcon className="w-5 h-5" />
                            {t('items.createFirstItem')}
                          </button>
                        </ActionIf>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto">
                        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                          <FunnelIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('items.noItemsInCategory', { category: selectedCategory })}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          {t('items.addItemsToCategory', { category: selectedCategory })}
                        </p>
                        <ActionIf ability="items.create">
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                          >
                            <PlusIcon className="w-5 h-5" />
                            {t('items.addItemToCategory', { category: selectedCategory })}
                          </button>
                        </ActionIf>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                              {item.name}
                            </h3>
                            {item.sku && (
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('items.skuLabelShort')} {item.sku}
                              </p>
                            )}
                          </div>
                          {item.category && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {item.category}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            ${item.unit_price}
                          </div>
                          <div className="flex space-x-3">
                            <button 
                              onClick={() => handleEditItem(item)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title={t('items.editItemTitle')}
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('items.deleteItemTitle')}
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {editingItem ? t('items.editItem') : t('items.createNewItem')}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('items.itemNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={itemData.name}
                    onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('items.enterItemName')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('items.unitPriceLabel')}
                  </label>
                  <input
                    type="number"
                    value={itemData.unit_price}
                    onChange={(e) => setItemData({ ...itemData, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('items.skuLabel')}
                  </label>
                  <input
                    type="text"
                    value={itemData.sku}
                    onChange={(e) => setItemData({ ...itemData, sku: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('items.optionalSku')}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('items.categoryLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                    >
                      {t('items.addNewCategory')}
                    </button>
                  </div>
                  <select
                    value={itemData.category}
                    onChange={(e) => setItemData({ ...itemData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('items.selectCategory')}</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('items.descriptionLabel')}
                </label>
                <textarea
                  value={itemData.description}
                  onChange={(e) => setItemData({ ...itemData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder={t('items.optionalDescription')}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                {t('items.cancel')}
              </button>
              <button
                onClick={() => editingItem ? handleUpdateItem(editingItem) : handleCreateItem()}
                disabled={!itemData.name.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
              >
                {editingItem ? t('items.updateItem') : t('items.createItem')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('items.addNewCategoryModal')}</h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('items.categoryNameLabel')}
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('items.categoryExample')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory()
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  {t('items.cancel')}
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {t('items.addCategory')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && selectedItems.size > 0 && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg relative z-10">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {t('items.deleteSelectedItems')}
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  {t('items.deleteItemConfirm', { count: selectedItems.size, plural: selectedItems.size !== 1 ? 's' : '' }).split('{{count}}').map((part, index) => 
                    index === 0 ? part : (
                      <span key={index}>
                        <strong className="font-semibold text-slate-900 dark:text-slate-100">{selectedItems.size}</strong>
                        {part}
                      </span>
                    )
                  )}
                </p>
                
                {/* Show preview of selected items */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('items.itemsToBeDeleted')}</h4>
                  <div className="space-y-2">
                    {Array.from(selectedItems).slice(0, 5).map(itemId => {
                      const item = items.find(i => i.id === itemId)
                      return item ? (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-600 rounded text-sm">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            <span>${item.unit_price.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : null
                    })}
                    {selectedItems.size > 5 && (
                      <div className="text-center py-2 text-slate-500 dark:text-slate-400 text-sm">
                        {t('items.andMoreItems', { count: selectedItems.size - 5, plural: selectedItems.size - 5 !== 1 ? 's' : '' })}
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">
                  {t('layouts.actionCannotBeUndone')}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelBulkDelete}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  {t('items.cancel')}
                </button>
                <button
                  onClick={handleConfirmBulkDelete}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Delete {selectedItems.size} {t('items.itemName', { plural: selectedItems.size !== 1 ? 's' : '' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {t('items.deleteItem')}
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300 mb-3">
                  {t('items.deleteItemConfirmSingle', { name: itemToDelete.name }).split('"').map((part, index) => 
                    index === 1 ? <strong key={index} className="font-semibold text-slate-900 dark:text-slate-100">{part}</strong> : part
                  )}
                </p>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{t('items.skuLabelShort')}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{itemToDelete.sku || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{t('items.priceLabelShort')}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">${itemToDelete.unit_price.toFixed(2)}</span>
                  </div>
                  {itemToDelete.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{t('items.categoryLabelShort')}</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{itemToDelete.category}</span>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">
                  {t('layouts.actionCannotBeUndone')}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                >
                  {t('items.cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {t('items.deleteItem')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
