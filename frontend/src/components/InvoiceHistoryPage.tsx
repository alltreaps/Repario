import { useState, useEffect } from 'react'
import {
  DocumentTextIcon,
  BanknotesIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/solid'
import { fetchInvoices, deleteInvoice, changeInvoiceStatus, type InvoiceWithRelations } from '../lib/api'
import { getStatusMessageTemplates, composeStatusMessage, openWhatsApp } from '../lib/whatsapp'
import WhatsAppMessagePopup from './WhatsAppMessagePopup'
import { useLanguage } from '../contexts/LanguageContext'

export default function InvoiceHistoryPage() {
  const { t } = useLanguage()
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  // Change status modal state
  const [showChangeStatusForId, setShowChangeStatusForId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<'pending' | 'working' | 'done' | 'refused'>('pending')
  const [extraNote, setExtraNote] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [sendWhatsAppMessage, setSendWhatsAppMessage] = useState(true)
  // WhatsApp message templates
  const [statusTemplates, setStatusTemplates] = useState<Record<string, { message: string; allowExtraNote: boolean; sendWhatsApp: boolean }>>({})
  // WhatsApp popup state
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false)
  const [whatsAppPopupData, setWhatsAppPopupData] = useState<{
    customerName: string
    customerPhone: string
    invoiceId: string
    status: string
    statusTemplate: string
    allowExtraNote: boolean
    initialExtraNote?: string
  } | null>(null)
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string; customerName: string; totalAmount: number; status: string; createdAt: string } | null>(null)

  useEffect(() => {
    console.log('🔄 InvoiceHistoryPage mounted, fetching invoices...')
    loadInvoices()
    loadStatusTemplates()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Check if click is outside both dropdown containers
      if (target && !target.closest('[data-dropdown="status-filter"]') && !target.closest('[data-dropdown="date-picker"]')) {
        setShowStatusFilter(false)
        setShowDatePicker(false)
      }
    }

    // Add event listener when any dropdown is open
    if (showStatusFilter || showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusFilter, showDatePicker])

  const loadInvoices = async () => {
    try {
      console.log('📡 Starting loadInvoices...')
      setLoading(true)
      setError(null)
      
      console.log('🌐 Making direct Supabase call to invoices...')
      const invoicesData = await fetchInvoices()

      console.log('✅ Invoices loaded successfully:', invoicesData)
      console.log('📊 Invoices count:', invoicesData?.length || 0)
      setInvoices(invoicesData || [])
    } catch (err: any) {
      console.error('❌ Error fetching invoices:', err)
      console.error('❌ Error details:', {
        message: err.message
      })
      setError(err.message || 'Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const loadStatusTemplates = async () => {
    try {
      const templates = await getStatusMessageTemplates()
      setStatusTemplates(templates)
    } catch (err: any) {
      console.error('❌ Error loading status templates:', err)
      // Don't show error to user as this is not critical
    }
  }

  const handleDeleteInvoice = async (invoiceId: string, customerName: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) return

    setInvoiceToDelete({
      id: invoiceId,
      customerName,
      totalAmount: invoice.total_amount,
      status: invoice.status,
      createdAt: invoice.created_at
    })
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return

    try {
      console.log('🗑️ Deleting invoice:', invoiceToDelete.id)
      await deleteInvoice(invoiceToDelete.id)
      
      // Remove the invoice from the local state
      setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== invoiceToDelete.id))
      
      setShowDeleteConfirm(false)
      setInvoiceToDelete(null)
      console.log('✅ Invoice deleted successfully')
    } catch (err: any) {
      console.error('❌ Error deleting invoice:', err)
      const errorMessage = err.message || 'Failed to delete invoice'
      alert(`Error deleting invoice: ${errorMessage}`)
      setShowDeleteConfirm(false)
      setInvoiceToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setInvoiceToDelete(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredInvoices = (invoices || []).filter(invoice => {
    const matchesSearch = invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All Status' || invoice.status === statusFilter.toLowerCase()
    
    // Date filtering
    let matchesDate = true
    if (startDate || endDate) {
      const invoiceDate = new Date(invoice.created_at)
      // Reset time to start of day for accurate date comparison
      invoiceDate.setHours(0, 0, 0, 0)
      
      const startDateObj = startDate ? new Date(startDate) : null
      const endDateObj = endDate ? new Date(endDate) : null
      
      if (startDateObj) startDateObj.setHours(0, 0, 0, 0)
      if (endDateObj) endDateObj.setHours(23, 59, 59, 999) // End of day for end date
      
      if (startDateObj && endDateObj) {
        // If same day selected for both, show results for that entire day
        if (startDate === endDate) {
          const selectedDate = new Date(startDate)
          selectedDate.setHours(0, 0, 0, 0)
          const selectedDateEnd = new Date(startDate)
          selectedDateEnd.setHours(23, 59, 59, 999)
          matchesDate = invoiceDate >= selectedDate && invoiceDate <= selectedDateEnd
        } else {
          matchesDate = invoiceDate >= startDateObj && invoiceDate <= endDateObj
        }
      } else if (startDateObj) {
        matchesDate = invoiceDate >= startDateObj
      } else if (endDateObj) {
        matchesDate = invoiceDate <= endDateObj
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'working':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'refused':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
    }
  }

  const openChangeStatus = (invoiceId: string, currentStatus: string) => {
    setShowChangeStatusForId(invoiceId)
    // Set initial selection to current
    if (currentStatus === 'pending' || currentStatus === 'working' || currentStatus === 'done' || currentStatus === 'refused') {
      setNewStatus(currentStatus)
    } else {
      setNewStatus('pending')
    }
    setExtraNote('')
    setSendWhatsAppMessage(true) // Reset to enabled by default
  }

  const handleStatusChange = (selectedStatus: string) => {
    // Only update the local state, don't save automatically
    setNewStatus(selectedStatus as 'pending' | 'working' | 'done' | 'refused')
  }
  
  const submitChangeStatus = async () => {
    if (!showChangeStatusForId) return
    
    const currentInvoice = invoices.find(inv => inv.id === showChangeStatusForId)
    if (!currentInvoice) return
    
    try {
      setSavingStatus(true)
      
      // Update the invoice status with extra note
      await changeInvoiceStatus(showChangeStatusForId, newStatus, extraNote || undefined)
      
      // Check if we should open WhatsApp directly
      const statusTemplate = statusTemplates[newStatus]
      if (sendWhatsAppMessage && statusTemplate && statusTemplate.sendWhatsApp && statusTemplate.message && currentInvoice.customers.phone) {
        // Compose the message and open WhatsApp directly
        const message = composeStatusMessage(
          statusTemplate.message,
          currentInvoice.customers.name,
          currentInvoice.id,
          newStatus,
          extraNote || undefined
        )
        
        // Open WhatsApp directly
        openWhatsApp(currentInvoice.customers.phone, message)
      }
      
      // Refetch invoices from backend to get latest status
      await loadInvoices()
      setShowChangeStatusForId(null)
      setExtraNote('')
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to change status')
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <>
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="hidden md:block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
              {t('invoices.invoiceHistory')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              {t('invoices.viewAndManageInvoices')}
            </p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 w-full md:w-auto justify-center">
            <ArrowDownTrayIcon className="w-5 h-5" />
            {t('invoices.exportAll')}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('invoices.totalInvoices')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{filteredInvoices.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <BanknotesIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('invoices.totalRevenue')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('invoices.pending')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {filteredInvoices.filter(invoice => invoice.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('invoices.working')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {filteredInvoices.filter(invoice => invoice.status === 'working').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={t('invoices.searchByCustomerName')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  {/* Date Picker Button */}
                  <div className="relative" data-dropdown="date-picker">
                    <button
                      onClick={() => {
                        setShowDatePicker(!showDatePicker)
                        setShowStatusFilter(false) // Close status filter when opening date picker
                      }}
                      className={`h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-center relative ${
                        (startDate || endDate) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                      }`}
                      title="Filter by date range"
                    >
                      <CalendarDaysIcon className={`w-4 h-4 ${
                        (startDate || endDate) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                      }`} />
                    </button>
                    
                    {showDatePicker && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10 p-4">
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('invoices.selectDateRange')}</h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('invoices.from')}</label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('invoices.to')}</label>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2">
                            <button
                              onClick={() => {
                                setStartDate('')
                                setEndDate('')
                              }}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                            >
                              {t('invoices.clear')}
                            </button>
                            <button
                              onClick={() => setShowDatePicker(false)}
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {t('invoices.apply')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" data-dropdown="status-filter">
                    <button
                      onClick={() => {
                        setShowStatusFilter(!showStatusFilter)
                        setShowDatePicker(false) // Close date picker when opening status filter
                      }}
                      className="h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-center relative"
                    >
                      <FunnelIcon className={`w-4 h-4 ${
                        statusFilter === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                        statusFilter === 'working' ? 'text-blue-600 dark:text-blue-400' :
                        statusFilter === 'done' ? 'text-green-600 dark:text-green-400' :
                        statusFilter === 'refused' ? 'text-red-600 dark:text-red-400' :
                        'text-slate-600 dark:text-slate-400'
                      }`} />
                    </button>
                    {showStatusFilter && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          {['All Status', 'pending', 'working', 'done', 'refused'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setStatusFilter(status)
                                setShowStatusFilter(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${
                                statusFilter === status 
                                  ? status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-l-4 border-yellow-500' :
                                    status === 'working' ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500' :
                                    status === 'done' ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-l-4 border-green-500' :
                                    status === 'refused' ? 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 border-l-4 border-red-500' :
                                    'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {status === 'All Status' ? t('invoices.allStatus') : t(`invoices.${status}`)}
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
          
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('invoices.invoiceId')}
                  </th>
                  <th className="px-8 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('invoices.client')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('invoices.amount')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('invoices.status')}
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('invoices.date')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('invoices.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm font-medium">{t('invoices.loadingInvoices')}</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-red-600 dark:text-red-400">
                        <p className="font-semibold text-base">{t('invoices.errorLoadingInvoices')}</p>
                        <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">{error}</p>
                        <button
                          onClick={fetchInvoices}
                          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          {t('invoices.tryAgain')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      {searchTerm || statusFilter !== 'All Status' ? (
                        <div className="text-slate-500 dark:text-slate-400">
                          <p className="font-semibold text-base">{t('invoices.noInvoicesFound')}</p>
                          <p className="text-sm mt-2">{t('invoices.tryAdjustingSearch')}</p>
                        </div>
                      ) : (
                        <div className="max-w-md mx-auto">
                          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                            <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('invoices.noInvoicesYet')}</h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {t('invoices.noInvoicesYetDescription')}
                          </p>
                          <button
                            onClick={() => window.location.href = '/invoices/new'}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                          >
                            <PlusIcon className="w-5 h-5" />
                            {t('invoices.createYourFirstInvoice')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            #{invoice.id.slice(0, 8)}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {invoice.customers.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm capitalize ${getStatusColor(invoice.status)}`}>
                          {t(`invoices.${invoice.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap text-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(invoice.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex justify-center items-center space-x-2">
                          {/* Edit Invoice Button */}
                          <button 
                            onClick={() => window.location.href = `/invoices/edit/${invoice.id}`}
                            className="p-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 group"
                            title={t('invoices.editInvoice')}
                          >
                            <PencilSquareIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                          
                          {/* Change Status Button */}
                          <button 
                            onClick={() => openChangeStatus(invoice.id, invoice.status)}
                            className="p-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all duration-200 group"
                            title={t('invoices.changeStatus')}
                          >
                            <ArrowPathIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                          
                          {/* Delete Button */}
                          <button 
                            onClick={() => handleDeleteInvoice(invoice.id, invoice.customers.name)}
                            className="p-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 group"
                            title={t('invoices.deleteInvoice')}
                          >
                            <TrashIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="md:hidden">
            {loading ? (
              <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>{t('invoices.loadingInvoices')}</span>
                </div>
              </div>
            ) : error ? (
              <div className="px-6 py-8 text-center">
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium">{t('invoices.errorLoadingInvoices')}</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button
                    onClick={fetchInvoices}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {t('invoices.tryAgain')}
                  </button>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="px-6 py-12 text-center">
                {searchTerm || statusFilter !== 'All Status' ? (
                  <div className="text-slate-500 dark:text-slate-400">
                    <p className="font-medium">{t('invoices.noInvoicesFound')}</p>
                    <p className="text-sm mt-1">{t('invoices.tryAdjustingSearch')}</p>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                      <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('invoices.noInvoicesYet')}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                      {t('invoices.noInvoicesYetDescription')}
                    </p>
                    <button
                      onClick={() => window.location.href = '/invoices/new'}
                      className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2 text-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      {t('invoices.createYourFirstInvoice')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                          {invoice.customers.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(invoice.status)}`}>
                        {t(`invoices.${invoice.status}`)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => window.location.href = `/invoices/edit/${invoice.id}`}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('invoices.editInvoice')}
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openChangeStatus(invoice.id, invoice.status)}
                          className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          title={t('invoices.changeStatus')}
                        >
                          <ArrowPathIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(invoice.id, invoice.customers.name)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('invoices.deleteInvoice')}
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
        </div>
      </div>
    </div>
    
    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && invoiceToDelete && (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('invoices.deleteInvoiceTitle')}
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                {t('invoices.deleteInvoiceConfirm', { customerName: invoiceToDelete.customerName })}
              </p>
              
              {/* Invoice Summary */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('invoices.invoiceDetailsLabel')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('invoices.customerLabel')}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{invoiceToDelete.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('invoices.amount')}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(invoiceToDelete.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('invoices.statusLabel')}</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                      invoiceToDelete.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      invoiceToDelete.status === 'working' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                      invoiceToDelete.status === 'done' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      invoiceToDelete.status === 'refused' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}>
                      {t(`invoices.${invoiceToDelete.status}`)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t('invoices.createdLabel')}</span>
                    <span className="text-slate-900 dark:text-slate-100">{formatDate(invoiceToDelete.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">
                {t('invoices.cannotBeUndone')}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {t('invoices.deleteInvoice')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Change Status Modal */}
    {showChangeStatusForId && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('invoices.changeInvoiceStatus')}</h3>
              <button
                onClick={() => setShowChangeStatusForId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('invoices.selectNewStatus')}
              {statusTemplates[newStatus]?.sendWhatsApp && statusTemplates[newStatus]?.message && (
                <span className="text-green-600 dark:text-green-400 block mt-1">
                  {t('invoices.whatsappWillBeSent')}
                </span>
              )}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('invoices.status')}</label>
              <select
                value={newStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={savingStatus}
              >
                <option value="pending">{t('invoices.pending')}</option>
                <option value="working">{t('invoices.working')}</option>
                <option value="done">{t('invoices.done')}</option>
                <option value="refused">{t('invoices.refused')}</option>
              </select>
              {savingStatus && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>{t('invoices.savingStatus')}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('invoices.extraNoteOptional')}
                {statusTemplates[newStatus]?.sendWhatsApp && (
                  <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                    {t('invoices.willBeAddedToWhatsapp')}
                  </span>
                )}
              </label>
              <textarea
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                rows={3}
                placeholder={statusTemplates[newStatus]?.sendWhatsApp ? 
                  t('invoices.addExtraMessage') : 
                  t('invoices.addExtraNote')
                }
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {statusTemplates[newStatus]?.sendWhatsApp && statusTemplates[newStatus]?.message && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">{t('invoices.whatsappMessagePreview')}</p>
                  <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                    {(() => {
                      const currentInvoice = invoices.find(inv => inv.id === showChangeStatusForId)
                      if (!currentInvoice) return statusTemplates[newStatus]?.message
                      return composeStatusMessage(
                        statusTemplates[newStatus]?.message || '',
                        currentInvoice.customers.name,
                        currentInvoice.id,
                        newStatus,
                        extraNote || undefined
                      )
                    })()}
                  </p>
                </div>
              )}
            </div>
            
            {/* WhatsApp Message Checkbox */}
            {statusTemplates[newStatus]?.sendWhatsApp && statusTemplates[newStatus]?.message && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWhatsAppMessage}
                    onChange={(e) => setSendWhatsAppMessage(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('invoices.sendWhatsappMessage')}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                      {t('invoices.recommended')}
                    </span>
                  </div>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-7">
                  {t('invoices.automaticallyNotify')}
                </p>
              </div>
            )}
          </div>
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowChangeStatusForId(null)
                setExtraNote('')
              }}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={savingStatus}
            >
              {t('invoices.cancel')}
            </button>
            <button
              onClick={submitChangeStatus}
              disabled={savingStatus}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition-colors"
            >
              {savingStatus ? t('invoices.updating') : t('invoices.updateStatus')}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* WhatsApp Message Popup */}
    {showWhatsAppPopup && whatsAppPopupData && (
      <WhatsAppMessagePopup
        isOpen={showWhatsAppPopup}
        onClose={() => {
          setShowWhatsAppPopup(false)
          setWhatsAppPopupData(null)
        }}
        customerName={whatsAppPopupData.customerName}
        customerPhone={whatsAppPopupData.customerPhone}
        invoiceId={whatsAppPopupData.invoiceId}
        status={whatsAppPopupData.status}
        statusTemplate={whatsAppPopupData.statusTemplate}
        allowExtraNote={whatsAppPopupData.allowExtraNote}
        initialExtraNote={whatsAppPopupData.initialExtraNote}
        onSend={() => {
          console.log('WhatsApp message sent for invoice:', whatsAppPopupData.invoiceId)
        }}
      />
    )}
    </>
  )
}
