import { useState, useEffect, useMemo } from 'react'
import {
  // ...existing code...
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  UsersIcon,
  CubeIcon
} from '@heroicons/react/24/solid'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchLayouts, fetchItems, fetchCustomers, fetchLayoutDeep, api } from '../lib/api'
import type { Layout, Field, FieldType, Item, InvoiceItem } from '../types'

export default function NewInvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const navigate = useNavigate()
  const isEditMode = Boolean(invoiceId)
  
  // Debug logging for edit mode detection
  console.log('🔧 Component initialization:', {
    invoiceId,
    isEditMode,
    invoiceIdType: typeof invoiceId,
    invoiceIdBoolean: Boolean(invoiceId)
  })
  
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState<Layout | undefined>(undefined)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: ''
  })
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [showCustomerConfirmDialog, setShowCustomerConfirmDialog] = useState(false)
  const [similarCustomers, setSimilarCustomers] = useState<any[]>([])
  const [pendingCustomerInfo, setPendingCustomerInfo] = useState<any>(null)
  const [forceCreateCustomer, setForceCreateCustomer] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isCustomerFromSuggestion, setIsCustomerFromSuggestion] = useState(false)
  const [invoiceData, setInvoiceData] = useState<Record<string, string | string[]>>({})
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [showSuggestionsForItem, setShowSuggestionsForItem] = useState<string | null>(null)
  const [existingInvoice, setExistingInvoice] = useState<any>(null)
  // New: invoice status
  const [status, setStatus] = useState<string>('pending')

  // Reset form state when switching between edit and new invoice modes
  useEffect(() => {
    if (!isEditMode) {
      // Reset all form state when switching to new invoice mode
      setCustomerInfo({ name: '', phone: '', address: '' })
      setSelectedCustomerId(null)
      setIsCustomerFromSuggestion(false)
      setForceCreateCustomer(false)
      setInvoiceData({})
      setItems([])
      setExistingInvoice(null)
      console.log('🔄 Form state reset for new invoice mode')
    }
  }, [isEditMode])

  // Fetch layouts and catalog items from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 NewInvoicePage: Fetching data with direct Supabase calls...')
        
        // Fetch layouts - Direct Supabase call for instant loading
        console.log('🌐 Fetching layouts instantly...')
        const layoutsData = await fetchLayouts()
        // Transform database format to component format for instant loading
        const transformedLayouts = layoutsData.map(layout => ({
          ...layout,
          isDefault: layout.is_default,
          sections: [], // Will be loaded on demand when layout is selected
          createdAt: layout.created_at,
          updatedAt: layout.updated_at
        }))
        setLayouts(transformedLayouts)
        
        // Only use a layout if there's explicitly a default one set
        const defaultLayout = transformedLayouts.find((layout: Layout) => layout.isDefault)
        
        // Load the default layout with sections only if one exists
        if (defaultLayout) {
          try {
            console.log('🌐 Loading default layout with sections...', defaultLayout.id)
            const fullDefaultLayout = await fetchLayoutDeep(defaultLayout.id)
            
            // Transform the database format to component format
            const transformedDefaultLayout = {
              ...fullDefaultLayout,
              isDefault: fullDefaultLayout.is_default,
              sections: fullDefaultLayout.sections?.map(section => ({
                id: section.id,
                title: section.title,
                fields: section.fields?.filter(field => field.type !== 'items').map(field => ({
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
              createdAt: fullDefaultLayout.created_at,
              updatedAt: fullDefaultLayout.updated_at
            }
            
            setSelectedLayout(transformedDefaultLayout)
            console.log('✅ Default layout loaded with sections:', transformedDefaultLayout.sections?.length || 0)
          } catch (error) {
            console.error('❌ Error loading default layout sections:', error)
            // Fallback to basic layout without sections
            setSelectedLayout(defaultLayout)
          }
        } else {
          console.log('ℹ️ No default layout found, using basic invoice (no layout)')
        }
        
        console.log('✅ Layouts loaded instantly:', layoutsData?.length || 0)
        
        // Fetch catalog items - Direct Supabase call for instant loading
        console.log('🌐 Fetching items instantly...')
        const itemsData = await fetchItems()
        setCatalogItems(itemsData)
        console.log('✅ Items loaded instantly:', itemsData?.length || 0)
        
        // Fetch customers - Direct Supabase call for instant loading
        console.log('🌐 Fetching customers instantly...')
        const customersData = await fetchCustomers()
        setCustomers(customersData || [])
        console.log('✅ Customers loaded instantly:', customersData?.length || 0)
        
        // Extract unique categories
        const uniqueCategories: string[] = [...new Set(
          itemsData
            .map((item: Item) => item.category)
            .filter((category: string | undefined): category is string => 
              Boolean(category && category.trim())
            )
        )] as string[]
        setAvailableCategories(uniqueCategories)
        
        // If in edit mode, fetch existing invoice data
        if (isEditMode && invoiceId) {
          console.log('🔄 Edit mode detected, fetching invoice:', invoiceId)
          await fetchExistingInvoice(invoiceId)
        }
      } catch (err) {
        console.error('❌ NewInvoicePage: Error fetching data:', err)
      } finally {
        console.log('✅ NewInvoicePage: All data loading completed instantly!')
      }
    }

    fetchData()
  }, [isEditMode, invoiceId])

  // Set the layout when both existingInvoice and layouts are available
  useEffect(() => {
    if (existingInvoice && existingInvoice.layouts?.id && layouts.length > 0) {
      console.log('🎨 Setting layout from existing invoice:', existingInvoice.layouts.id)
      const invoiceLayout = layouts.find(l => l.id === existingInvoice.layouts.id)
      if (invoiceLayout) {
        setSelectedLayout(invoiceLayout)
        console.log('✅ Layout set:', invoiceLayout.name)
      } else {
        console.warn('⚠️ Layout not found:', existingInvoice.layouts.id)
      }
    }
  }, [existingInvoice, layouts])

  // Fetch existing invoice data for editing
  const fetchExistingInvoice = async (id: string) => {
    try {
      console.log('📡 Fetching existing invoice:', id)
      const response = await api.get(`/invoices/${id}`)
      console.log('📋 Raw API response:', response.data)
      
      // API returns data as { invoice: responseData }
      const invoice = response.data.invoice
      console.log('📋 Parsed invoice data:', invoice)
  setExistingInvoice(invoice)
  setStatus(invoice.status || 'pending')
      
      // Populate customer info - customers is a nested object from Supabase join
      const customerData = invoice.customers || {}
      setCustomerInfo({
        name: customerData.name || '',
        phone: customerData.phone || '',
        address: customerData.address || ''
      })
      setSelectedCustomerId(customerData.id || null)
      setIsCustomerFromSuggestion(true) // In edit mode, always consider as selected
      console.log('👤 Customer info set:', {
        name: customerData.name || '',
        phone: customerData.phone || '',
        address: customerData.address || ''
      })
      
      // Populate invoice items - items array is directly in the response
      const invoiceItems = invoice.items || []
      if (invoiceItems && Array.isArray(invoiceItems)) {
        const parsedItems: InvoiceItem[] = invoiceItems.map((item: any) => ({
          id: item.id || Date.now().toString(),
          name: item.name || '',
          quantity: item.quantity || 1,
          price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0)
        }))
        setItems(parsedItems)
        console.log('📦 Invoice items set:', parsedItems)
      }
      
      // Populate form data if it exists
      const formData = invoice.form_data || {}
      if (formData && Object.keys(formData).length > 0) {
        setInvoiceData(formData)
        console.log('📝 Form data set:', formData)
      }
      

      
      console.log('✅ Invoice data loaded for editing:', invoice)
    } catch (err: any) {
      console.error('❌ Error fetching invoice for editing:', err)
      alert('Failed to load invoice data. Please try again.')
      // Navigate back to history if invoice not found
      if (err.response?.status === 404) {
        navigate('/invoices/history')
      }
    }
  }

  // Filter items based on search and category
  const filteredCatalogItems = useMemo(() => {
    return catalogItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategoryFilter === 'all' || 
        item.category === selectedCategoryFilter
      
      return matchesSearch && matchesCategory
    })
  }, [catalogItems, searchTerm, selectedCategoryFilter])

  // Invoice calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  // Filter customers based on name input
  const getFilteredCustomers = (nameInput: string) => {
    if (!nameInput.trim()) return []
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(nameInput.toLowerCase())
    ).slice(0, 5) // Limit to 5 suggestions
  }

  const selectCustomer = (customer: any) => {
    setCustomerInfo({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || ''
    })
    setSelectedCustomerId(customer.id)
    setIsCustomerFromSuggestion(true)
    setShowCustomerSuggestions(false)
    setShowCustomerConfirmDialog(false)
  }

  // Function to check for similar customers before saving
  const checkForSimilarCustomers = (customerName: string): any[] => {
    if (!customerName.trim()) return []
    
    return customers.filter(customer => {
      const nameLower = customerName.toLowerCase().trim()
      const customerNameLower = customer.name.toLowerCase().trim()
      
      if (nameLower === customerNameLower) return false // Exact match is okay
      
      // Check for similarity (simple approach)
      const similarity = calculateSimilarity(nameLower, customerNameLower)
      return similarity >= 0.8 // 80% similarity threshold
    })
  }

  // Simple similarity calculation
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Levenshtein distance calculation for similarity
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  const proceedWithNewCustomer = () => {
    setShowCustomerConfirmDialog(false)
    setForceCreateCustomer(true)
    setIsCustomerFromSuggestion(true) // Mark as confirmed by user
    // Continue with the actual save operation
    performSaveInvoice()
  }

  const showSimilarCustomersDialog = (similar: any[], customerInfo: any) => {
    setSimilarCustomers(similar)
    setPendingCustomerInfo(customerInfo)
    setShowCustomerConfirmDialog(true)
  }

  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
    
    // When user manually types (especially in name field), reset customer selection tracking
    if (field === 'name') {
      setSelectedCustomerId(null)
      setIsCustomerFromSuggestion(false)
      setForceCreateCustomer(false)
      
      if (value.trim()) {
        setShowCustomerSuggestions(true)
      } else {
        setShowCustomerSuggestions(false)
      }
    }
  }

  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setInvoiceData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleLayoutChange = async (layoutId: string) => {
    if (!layoutId) {
      // No layout selected - clear the current layout
      setSelectedLayout(undefined)
      setInvoiceData({})
      return
    }
    
    const layout = layouts.find(l => l.id === layoutId)
    if (layout) {
      // Set the basic layout first for immediate UI update
      setSelectedLayout(layout)
      
      // Load full layout with sections in the background
      try {
        console.log('🌐 Loading full layout with sections...', layoutId)
        const fullLayout = await fetchLayoutDeep(layoutId)
        
        // Transform the database format to component format
        const transformedLayout = {
          ...fullLayout,
          isDefault: fullLayout.is_default,
          sections: fullLayout.sections?.map(section => ({
            id: section.id,
            title: section.title,
            fields: section.fields?.filter(field => field.type !== 'items').map(field => ({
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
          createdAt: fullLayout.created_at,
          updatedAt: fullLayout.updated_at
        }
        
        setSelectedLayout(transformedLayout)
        console.log('✅ Full layout loaded with sections:', transformedLayout.sections?.length || 0)
      } catch (error) {
        console.error('❌ Error loading full layout:', error)
        // If loading full layout fails, keep the basic layout
      }
    }
    
    // Clear previous layout data when switching layouts
    setInvoiceData({})
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      price: 0,
      total: 0
    }
    setItems(prev => [...prev, newItem])
  }

  const addItemFromCatalog = (catalogItem: Item) => {
    // Check if there's an empty item that we can replace
    const emptyItemIndex = items.findIndex(item => 
      !item.name.trim() && item.quantity === 1 && item.price === 0
    )
    
    if (emptyItemIndex !== -1) {
      // Replace the empty item
      setItems(prev => prev.map((item, index) => 
        index === emptyItemIndex 
          ? {
              ...item,
              name: catalogItem.name,
              price: catalogItem.unit_price,
              total: item.quantity * catalogItem.unit_price
            }
          : item
      ))
    } else {
      // Only add new item if no empty items exist
      const newItem: InvoiceItem = {
        id: Date.now().toString(),
        name: catalogItem.name,
        quantity: 1,
        price: catalogItem.unit_price,
        total: catalogItem.unit_price
      }
      setItems(prev => [...prev, newItem])
    }
    setShowItemSelector(false)
  }

  const selectItemFromSearch = (invoiceItemId: string, catalogItem: Item) => {
    setItems(prev => prev.map(item => 
      item.id === invoiceItemId 
        ? {
            ...item,
            name: catalogItem.name,
            price: catalogItem.unit_price,
            total: item.quantity * catalogItem.unit_price
          }
        : item
    ))
    // Hide suggestions for this item after selection
    setShowSuggestionsForItem(null)
  }

  const getFilteredSuggestions = (searchQuery: string) => {
    if (!searchQuery.trim()) return []
    return catalogItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5) // Limit to 5 suggestions
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = updatedItem.quantity * updatedItem.price
        }
        return updatedItem
      }
      return item
    }))
  }

  const handleSaveInvoice = async () => {
    // Validate customer selection logic (only for new invoices, not edits)
    if (!isEditMode && !forceCreateCustomer) {
      const exactMatch = customers.find(customer => 
        customer.name.toLowerCase().trim() === customerInfo.name.toLowerCase().trim()
      )
      
      if (exactMatch && !isCustomerFromSuggestion) {
        alert(`Customer "${customerInfo.name}" already exists. Please select from the dropdown suggestions.`)
        return
      }
      
      const similarFound = checkForSimilarCustomers(customerInfo.name)
      if (similarFound.length > 0 && !isCustomerFromSuggestion) {
        showSimilarCustomersDialog(similarFound, customerInfo)
        return
      }
    }
    
    // If validation passes, proceed with save
    await performSaveInvoice()
  }

  const performSaveInvoice = async () => {
    try {
      // Debug logging for edit mode
      console.log('🔍 Save function debug:', {
        isEditMode,
        invoiceId,
        existingInvoiceId: existingInvoice?.id
      })
      
      // Validate required fields before sending
      // Layout is now optional
      if (!customerInfo.name?.trim()) {
        alert('Please enter customer name before saving the invoice.')
        return
      }

      if (items.length === 0) {
        alert('Please add at least one item before saving the invoice.')
        return
      }

      // Validate all items have required fields
      const invalidItems = items.filter(item => 
        !item.name?.trim() || 
        item.quantity <= 0 || 
        item.price < 0 || 
        item.total < 0
      )

      if (invalidItems.length > 0) {
        alert('Please ensure all items have valid name, quantity, price, and total values.')
        return
      }

      const invoiceDataToSave = {
        customerInfo: {
          id: selectedCustomerId, // Include customer ID if selected from suggestions
          name: customerInfo.name.trim(),
          phone: customerInfo.phone?.trim() || null,
          address: customerInfo.address?.trim() || null,
          forceCreate: forceCreateCustomer // Flag to bypass similarity check
        },
        layoutId: selectedLayout?.id || null, // Layout is now optional
        formData: invoiceData,
        status: status, // Include status in main payload
        items: items.map(item => ({
          name: item.name.trim(),
          description: item.description?.trim() || null,
          quantity: Number(item.quantity),
          price: Number(item.price),
          total: Number(item.total)
        }))
        // createdAt is handled automatically by the database
      };
      // Remove the separate status assignment
      // (invoiceDataToSave as any).status = status
      
      console.log(`${isEditMode ? 'Updating' : 'Saving'} invoice:`, invoiceDataToSave)
      
      const response = isEditMode 
        ? await api.put(`/invoices/${invoiceId}`, invoiceDataToSave)
        : await api.post('/invoices', invoiceDataToSave)
      
      if (response.data?.invoice) {
        console.log(`Invoice ${isEditMode ? 'updated' : 'saved'} successfully:`, response.data.invoice)
        alert(`Invoice ${isEditMode ? 'updated' : 'saved'} successfully! Invoice ID: ${response.data.invoice.id}`)
        
        if (isEditMode) {
          // Navigate back to history after successful edit
          navigate('/invoices/history')
        } else {
          // Reset form after successful save
          setCustomerInfo({ name: '', phone: '', address: '' })
          setSelectedCustomerId(null)
          setIsCustomerFromSuggestion(false)
          setForceCreateCustomer(false)
          setInvoiceData({})
          setItems([])
        }
      } else {
        throw new Error('Invalid response format from server')
      }
    } catch (err: any) {
      console.error('Error saving invoice:', err)
      
      // Handle different types of errors
      let errorMessage = 'Failed to save invoice. Please try again.'
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      alert(errorMessage)
    }
  }

  const renderField = (field: Field, sectionId: string) => {
    const fieldKey = `${sectionId}_${field.id}`
    const rawFieldValue = invoiceData[fieldKey]
    
    // Handle different field types appropriately
    const fieldValue = field.type === 'checkboxes' 
      ? (Array.isArray(rawFieldValue) ? rawFieldValue.filter((v): v is string => typeof v === 'string') : [])
      : (typeof rawFieldValue === 'string' ? rawFieldValue : '')

    switch (field.type) {
      case 'input':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={fieldValue as string}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.required}
            />
          </div>
        )

      case 'description':
        return (
          <div key={field.id} className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={fieldValue as string}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.required}
            />
          </div>
        )

      case 'dropdown':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={fieldValue as string}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.required}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'checkboxes':
        return (
          <div key={field.id} className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {field.options?.map((option) => (
                <label key={option.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Array.isArray(fieldValue) && fieldValue.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(fieldValue) ? fieldValue : []
                      if (e.target.checked) {
                        handleFieldChange(fieldKey, [...currentValues, option.value])
                      } else {
                        handleFieldChange(fieldKey, currentValues.filter((v) => v !== option.value))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Hidden on mobile, shown on desktop */}
        <div className="hidden md:block mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
            {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
            {isEditMode ? 'Update the customer details and invoice information' : 'Fill in the customer details and invoice information'}
          </p>
        </div>

        {/* Invoice Status (as icons, above customer info) */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-3 sm:gap-6 flex-wrap">
            {[
              { key: 'pending', label: 'Pending', icon: (
                <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) },
              { key: 'working', label: 'Working', icon: (
                <ArrowPathIcon className="w-6 h-6 mr-2 text-blue-500" />
              ) },
              { key: 'done', label: 'Done', icon: (
                <CheckCircleIcon className="w-6 h-6 mr-2 text-green-600" />
              ) },
              { key: 'refused', label: 'Refused', icon: (
                <XCircleIcon className="w-6 h-6 mr-2 text-red-600" />
              ) },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`flex flex-row items-center justify-center px-2 py-1 sm:px-4 sm:py-2 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer select-none
                  ${status === key ?
                    key === 'pending' ? 'bg-yellow-500 text-white border-0' :
                    key === 'working' ? 'bg-blue-500 text-white border-0' :
                    key === 'done' ? 'bg-green-600 text-white border-0' :
                    key === 'refused' ? 'bg-red-600 text-white border-0' :
                    'border-0'
                  :
                    key === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-400 border-2' :
                    key === 'working' ? 'bg-blue-100 text-blue-700 border-blue-400 border-2' :
                    key === 'done' ? 'bg-green-100 text-green-700 border-green-400 border-2' :
                    key === 'refused' ? 'bg-red-100 text-red-700 border-red-400 border-2' :
                    'border-2'}
                `}
                style={{ minWidth: 72, minHeight: 36 }}
                tabIndex={0}
                aria-pressed={status === key}
              >
                {/* Icon smaller on mobile */}
                <span className="mr-1 sm:mr-2 flex items-center">
                  {key === 'pending' && (
                    <svg
                      className={`w-4 h-4 sm:w-6 sm:h-6 ${status === 'pending' ? 'text-white' : 'text-yellow-500'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {key === 'working' && (
                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 0l3 3" />
                    </svg>
                  )}
                  {key === 'done' && (
                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                    </svg>
                  )}
                  {key === 'refused' && (
                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6m0-6l6 6" />
                    </svg>
                  )}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Customer Info Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Information</h2>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
              Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                  onFocus={() => {
                    if (customerInfo.name.trim()) {
                      setShowCustomerSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    // Hide suggestions when clicking outside (with small delay to allow clicks)
                    setTimeout(() => setShowCustomerSuggestions(false), 150)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name (start typing to search existing customers)"
                  required
                />
                
                {/* Customer Selection Status Indicator */}
                {isCustomerFromSuggestion && selectedCustomerId && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    <span>Selected from existing customers</span>
                  </div>
                )}
                
                {!isCustomerFromSuggestion && customerInfo.name.trim() && !isEditMode && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>
                      {forceCreateCustomer 
                        ? "Will create new customer (confirmed)" 
                        : "Will create new customer (check for similar names)"
                      }
                    </span>
                  </div>
                )}
                {/* Customer Suggestions */}
                {showCustomerSuggestions && customerInfo.name && getFilteredCustomers(customerInfo.name).length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {getFilteredCustomers(customerInfo.name).map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{customer.name}</div>
                            {customer.phone && (
                              <div className="text-sm text-slate-500 dark:text-slate-400">{customer.phone}</div>
                            )}
                            {customer.address && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{customer.address}</div>
                            )}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                            Click to select
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerInfo.address}
                onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer address"
                required
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
              <CubeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Invoice Items</h2>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-600 px-4 py-3 border-b border-slate-300 dark:border-slate-500">
              {/* Custom grid layout for desktop: larger item column, smaller qty/price columns */}
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2 md:gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <div className="col-span-4 md:col-span-5 text-left">Item</div>
                <div className="col-span-1 md:col-span-2 text-center">Qty</div>
                <div className="col-span-2 md:col-span-2 text-center">Price</div>
                <div className="hidden md:block md:col-span-2 text-center">Total</div>
                <div className="col-span-1 md:col-span-1 text-center">Action</div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-500 dark:text-slate-400 mb-4">
                    <CubeIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No items added yet</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Add items to your invoice using the buttons below
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="grid grid-cols-8 md:grid-cols-12 gap-2 md:gap-4 items-center">
                    {/* Name: span 4/8 on mobile, 5/12 on desktop (larger) */}
                    <div className="relative col-span-4 md:col-span-5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          updateItem(item.id, 'name', e.target.value)
                          // Show suggestions when user is typing
                          if (e.target.value.trim()) {
                            setShowSuggestionsForItem(item.id)
                          } else {
                            setShowSuggestionsForItem(null)
                          }
                        }}
                        onFocus={() => {
                          // Show suggestions when focusing if there's text
                          if (item.name.trim()) {
                            setShowSuggestionsForItem(item.id)
                          }
                        }}
                        onBlur={() => {
                          // Hide suggestions when clicking outside (with small delay to allow clicks)
                          setTimeout(() => setShowSuggestionsForItem(null), 150)
                        }}
                        placeholder="Item name (start typing to search)"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      />
                      {/* Search Suggestions */}
                      {showSuggestionsForItem === item.id && item.name && getFilteredSuggestions(item.name).length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                          {getFilteredSuggestions(item.name).map((suggestion) => (
                            <div
                              key={suggestion.id}
                              onClick={() => selectItemFromSearch(item.id, suggestion)}
                              className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{suggestion.name}</div>
                                  {suggestion.category && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{suggestion.category}</div>
                                  )}
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-400">${suggestion.unit_price}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Quantity: span 1/8 on mobile, 2/12 on desktop (smaller) */}
                    <div className="col-span-1 md:col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          // Allow any value during typing, including empty string
                          const value = e.target.value
                          updateItem(item.id, 'quantity', value === '' ? '' : (parseInt(value) || ''))
                        }}
                        onBlur={(e) => {
                          // Only set default when user leaves the field
                          if (e.target.value === '' || parseInt(e.target.value) < 1) {
                            updateItem(item.id, 'quantity', 1)
                          }
                        }}
                        min="1"
                        className="w-full px-2 py-2 border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    {/* Price: span 2/8 on mobile, 2/12 on desktop (smaller) */}
                    <div className="col-span-2 md:col-span-2">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          // Allow any value during typing, including empty string
                          const value = e.target.value
                          updateItem(item.id, 'price', value === '' ? '' : (parseFloat(value) || ''))
                        }}
                        onBlur={(e) => {
                          // Only set default when user leaves the field
                          if (e.target.value === '') {
                            updateItem(item.id, 'price', 0)
                          } else if (parseFloat(e.target.value) < 0) {
                            updateItem(item.id, 'price', 0)
                          }
                        }}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-2 border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    
                    {/* Total: hidden on mobile, 2/12 on desktop */}
                    <div className="hidden md:block md:col-span-2 text-center font-medium text-slate-900 dark:text-slate-100">
                      ${item.total.toFixed(2)}
                    </div>
                    
                    {/* Actions: span 1/8 on mobile, 1/12 on desktop */}
                    <div className="col-span-1 md:col-span-1 md:flex justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 md:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center w-full md:w-auto"
                        title="Remove Item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-600">
                <div className="flex gap-2">
                  <button
                    onClick={addItem}
                    className="py-2 px-2 md:px-4 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    title="Add Item"
                  >
                    <PlusIcon className="w-5 h-5 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Add Item</span>
                  </button>
                  {catalogItems.length > 0 && (
                    <button
                      onClick={() => setShowItemSelector(true)}
                      className="py-2 px-2 md:px-4 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      title="Choose from Catalog"
                    >
                      <CubeIcon className="w-5 h-5 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                      <span className="hidden md:inline">Choose from Catalog</span>
                    </button>
                  )}
                </div>
                
                <div className="text-right space-y-2">
                  <div className="flex justify-between items-center gap-8 text-lg font-bold">
                    <span>Subtotal:</span>
                    <span className="text-green-600 dark:text-green-400">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Selection - Optional */}
        <div className="mb-8">
          {layouts.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
              <div className="mb-4">
                <RectangleGroupIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              </div>
              <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Invoice Layouts</h4>
              <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
                You can create invoices without layouts, or create a layout template for consistent formatting across all your invoices.
              </p>
              <button
                onClick={() => window.location.href = '/layouts'}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Create Your First Layout
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Choose Layout (Optional):
              </label>
              <select
                value={selectedLayout?.id || ''}
                onChange={(e) => handleLayoutChange(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No Layout (Basic Invoice)</option>
                {layouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name} {layout.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

  {/* ...existing code... */}

        {/* Dynamic Layout Sections - Only show if layouts exist and one is selected */}
        {layouts.length > 0 && selectedLayout && selectedLayout.sections.map((section) => (
          <div key={section.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <RectangleStackIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{section.title}</h2>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.fields.map((field) => renderField(field, section.id))}
            </div>
          </div>
        ))}

        {/* Action Buttons - Always show for invoice creation */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mb-8">
          <button className="px-8 py-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
            Save as Draft
          </button>
          <button 
            onClick={handleSaveInvoice}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            {isEditMode ? 'Update Invoice' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {/* Item Selector Modal */}
      {showItemSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Choose from Catalog</h3>
                <button
                  onClick={() => setShowItemSelector(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Select items from your catalog to add to the invoice
              </p>
            </div>
            
            {/* Search and Filter Section */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Category Filter */}
                <div className="w-full sm:w-48">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {catalogItems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No items in catalog</h4>
                      <p className="text-slate-600 dark:text-slate-400">Create some items in your catalog first to select from here.</p>
                    </div>
                ) : filteredCatalogItems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No items found</h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        Try adjusting your search terms or category filter.
                      </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCatalogItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => addItemFromCatalog(item)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{item.name}</h4>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                            ${item.unit_price}
                          </span>
                        </div>
                        
                        {item.description && (
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">
                            Unit: {item.unit}
                          </span>
                          {item.category && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                              {item.category}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                          <button className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
                            Add to Invoice
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Confirmation Dialog */}
      {showCustomerConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Similar Customers Found</h3>
                <button
                  onClick={() => setShowCustomerConfirmDialog(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                We found customers with similar names. Please choose an existing customer or confirm you want to create a new one.
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  You are trying to create:
                </h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{pendingCustomerInfo?.name}</div>
                  {pendingCustomerInfo?.phone && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">{pendingCustomerInfo.phone}</div>
                  )}
                  {pendingCustomerInfo?.address && (
                    <div className="text-xs text-slate-500 dark:text-slate-500">{pendingCustomerInfo.address}</div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Similar existing customers:
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {similarCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-slate-600 dark:text-slate-400">{customer.phone}</div>
                          )}
                          {customer.address && (
                            <div className="text-xs text-slate-500 dark:text-slate-500">{customer.address}</div>
                          )}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                          Click to select
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCustomerConfirmDialog(false)}
                  className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedWithNewCustomer}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Create New Customer Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
