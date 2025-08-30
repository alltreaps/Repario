import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionIf from './ActionIf'
import { useTranslation } from '../contexts/LanguageContext'
import {
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/solid'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, type CustomerRow } from '../lib/api'

export default function AccountsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [selectedPhone, setSelectedPhone] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRow | null>(null)

  useEffect(() => {
    console.log('🔄 AccountsPage mounted, fetching customers...')
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      console.log('📡 Starting loadCustomers...')
      setLoading(true)
      setError(null)
      
      console.log('🌐 Making direct Supabase call to customers...')
      const customers = await fetchCustomers()

      console.log('✅ Customers loaded successfully:', customers)
      console.log('📊 Customers count:', customers?.length || 0)
      setCustomers(customers || [])
    } catch (err: any) {
      console.error('❌ Error fetching customers:', err)
      console.error('❌ Error details:', {
        message: err.message
      })
      setError(err.message || t('accounts.failedToFetchCustomers'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert(t('accounts.customerNameRequired'))
      return
    }

    try {
      setCreating(true)
      
      console.log('🆕 Creating new customer:', formData)
      const newCustomer = await createCustomer(formData)

      console.log('✅ Customer created:', newCustomer)
      
      // Reset form and close modal
      setFormData({ name: '', phone: '', address: '' })
      setShowModal(false)
      
      // Refresh customer list
      await loadCustomers()
      
    } catch (err: any) {
      console.error('❌ Error creating customer:', err)
      console.error('❌ Full error details:', {
        message: err.message
      })
      
      let errorMessage = t('accounts.failedToCreateCustomer')
      if (err.message) {
        errorMessage = err.message
      }
      
      alert(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !editingCustomer) {
      alert(t('accounts.customerNameRequired'))
      return
    }

    try {
      setEditing(true)
      
      console.log('✏️ Updating customer:', editingCustomer.id, formData)
      const updatedCustomer = await updateCustomer(editingCustomer.id, formData)

      console.log('✅ Customer updated:', updatedCustomer)
      
      // Reset form and close modal
      setFormData({ name: '', phone: '', address: '' })
      setShowModal(false)
      setEditingCustomer(null)
      
      // Refresh customer list
      await loadCustomers()
      
    } catch (err: any) {
      console.error('❌ Error updating customer:', err)
      
      let errorMessage = t('accounts.failedToUpdateCustomer')
      if (err.message) {
        errorMessage = err.message
      }
      
      alert(errorMessage)
    } finally {
      setEditing(false)
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return

    setCustomerToDelete(customer)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return

    try {
      console.log('🗑️ Deleting customer:', customerToDelete.id)
      await deleteCustomer(customerToDelete.id)
      
      // Remove the customer from the local state
      setCustomers(prevCustomers => prevCustomers.filter(customer => customer.id !== customerToDelete.id))
      
      setShowDeleteConfirm(false)
      setCustomerToDelete(null)
      console.log('✅ Customer deleted successfully')
    } catch (err: any) {
      console.error('❌ Error deleting customer:', err)
      const errorMessage = err.message || t('accounts.failedToDeleteCustomer')
      alert(`Error deleting customer: ${errorMessage}`)
      setShowDeleteConfirm(false)
      setCustomerToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setCustomerToDelete(null)
  }

  const handleEditCustomer = (customer: CustomerRow) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCustomer(null)
    setFormData({ name: '', phone: '', address: '' })
  }

  const handlePhoneClick = (phone: string) => {
    if (phone && phone !== '—') {
      setSelectedPhone(phone)
      setShowPhoneModal(true)
    }
  }

  const handlePhoneAction = (action: 'call' | 'whatsapp') => {
    if (selectedPhone) {
      if (action === 'call') {
        window.open(`tel:${selectedPhone}`, '_self')
      } else {
        window.open(`https://wa.me/${selectedPhone.replace(/[^\d]/g, '')}`, '_blank')
      }
    }
    setShowPhoneModal(false)
    setSelectedPhone('')
  }

  const handleViewCustomerHistory = (customer: CustomerRow) => {
    console.log('📊 Navigating to customer history for:', customer.name)
    navigate(`/accounts/history/${customer.id}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower) ||
      customer.id.toLowerCase().includes(searchLower)
    )
  })

  // Calculate stats from real data
  const totalCustomers = customers.length
  const activeCustomers = customers.length // All customers are considered active for now

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="hidden md:block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
              {t('accounts.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              {t('accounts.subtitle')}
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            {t('accounts.addNewCustomer')}
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UserGroupIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('accounts.totalCustomers')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? '...' : totalCustomers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('accounts.active')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? '...' : activeCustomers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('accounts.recentCustomers')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? '...' : customers.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">{t('accounts.thisMonth')}</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">+12%</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t('accounts.searchAccounts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('accounts.customer')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('accounts.contact')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('accounts.address')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('accounts.created')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('accounts.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm font-medium">{t('accounts.loadingCustomers')}</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-red-600 dark:text-red-400">
                        <p className="font-semibold text-base">{t('accounts.errorLoadingCustomers')}</p>
                        <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">{error}</p>
                        <button
                          onClick={fetchCustomers}
                          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          {t('accounts.tryAgain')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      {searchTerm ? (
                        <div className="text-slate-500 dark:text-slate-400">
                          <p className="font-semibold text-base">{t('accounts.noCustomersFound')}</p>
                          <p className="text-sm mt-2">{t('accounts.tryAdjustingSearch')}</p>
                        </div>
                      ) : (
                        <div className="max-w-md mx-auto">
                          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                            <UserGroupIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('accounts.noCustomersYet')}</h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {t('accounts.noCustomersYetDescription')}
                          </p>
                          <ActionIf ability="clients.create">
                            <button
                              onClick={() => setShowModal(true)}
                              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2"
                            >
                              <PlusIcon className="w-5 h-5" />
                              {t('accounts.addYourFirstCustomer')}
                            </button>
                          </ActionIf>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                              <span className="text-base font-bold text-white">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {customer.name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {t('accounts.id')} {customer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        {customer.phone && customer.phone !== '—' ? (
                          <button 
                            onClick={() => handlePhoneClick(customer.phone!)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                          >
                            {customer.phone}
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {customer.address || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(customer.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex justify-center items-center space-x-2">
                          <ActionIf ability="clients.view">
                            <button 
                              onClick={() => handleViewCustomerHistory(customer)}
                              className="p-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 group" 
                              title={t('accounts.viewCustomerHistory')}
                            >
                              <EyeIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          </ActionIf>
                          <ActionIf ability="clients.edit">
                            <button 
                              onClick={() => handleEditCustomer(customer)}
                              className="p-2.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200 group" 
                              title={t('accounts.editCustomer')}
                            >
                              <PencilSquareIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          </ActionIf>
                          <ActionIf ability="clients.delete">
                            <button 
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="p-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 group" 
                              title={t('accounts.deleteCustomer')}
                            >
                              <TrashIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          </ActionIf>
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
                  <span>{t('accounts.loadingCustomers')}</span>
                </div>
              </div>
            ) : error ? (
              <div className="px-6 py-8 text-center">
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium">{t('accounts.errorLoadingCustomers')}</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button
                    onClick={fetchCustomers}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {t('accounts.tryAgain')}
                  </button>
                </div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                {searchTerm ? (
                  <div className="text-slate-500 dark:text-slate-400">
                    <p className="font-medium">{t('accounts.noCustomersFound')}</p>
                    <p className="text-sm mt-1">{t('accounts.tryAdjustingSearch')}</p>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                      <UserGroupIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('accounts.noCustomersYet')}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                      {t('accounts.noCustomersYetDescription')}
                    </p>
                    <ActionIf ability="clients.create">
                      <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 gap-2 text-sm"
                      >
                        <PlusIcon className="w-4 h-4" />
                        {t('accounts.addYourFirstCustomer')}
                      </button>
                    </ActionIf>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                              {customer.name}
                            </h3>
                          </div>
                          {customer.phone && customer.phone !== 'No phone number' ? (
                            <button 
                              onClick={() => handlePhoneClick(customer.phone!)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                            >
                              {customer.phone}
                            </button>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {t('accounts.noPhoneNumber')}
                            </p>
                          )}
                          {customer.address && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button 
                        onClick={() => handleViewCustomerHistory(customer)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" 
                        title={t('accounts.viewCustomerHistory')}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" 
                        title={t('accounts.editCustomer')}
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                        title={t('accounts.deleteCustomer')}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Add Customer Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {editingCustomer ? t('accounts.editCustomerTitle') : t('accounts.addNewCustomerTitle')}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('accounts.customerNameLabel')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('accounts.enterCustomerName')}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('accounts.phoneNumberLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 dark:text-slate-400">+964</span>
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone.replace(/^\+964/, '')}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                          setFormData(prev => ({ ...prev, phone: '+964' + value }));
                        }}
                        className="w-full pl-16 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('accounts.phonePlaceholder')}
                        pattern="[0-9]{10}"
                        title="Phone number must be exactly 10 digits"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('accounts.addressLabel')}
                    </label>
                    <input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder={t('accounts.enterCustomerAddress')}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {t('accounts.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={(creating || editing) || !formData.name.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
                  >
                    {(creating || editing) ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{editingCustomer ? t('accounts.updating') : t('accounts.creating')}</span>
                      </div>
                    ) : (
                      editingCustomer ? t('accounts.updateCustomer') : t('accounts.createCustomer')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && customerToDelete && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('accounts.deleteCustomerTitle')}
                  </h3>
                </div>
                
                <div className="mb-6">
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('accounts.deleteCustomerConfirm', { name: customerToDelete.name })}
                  </p>
                  
                  {/* Customer Summary */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                        <span className="text-sm font-bold text-white">
                          {customerToDelete.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">{customerToDelete.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">ID: {customerToDelete.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t('accounts.phoneLabel')}</span>
                        <span className="text-slate-900 dark:text-slate-100">{customerToDelete.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t('accounts.addressLabelShort')}</span>
                        <span className="text-slate-900 dark:text-slate-100 text-right max-w-48 truncate">{customerToDelete.address || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t('accounts.createdLabel')}</span>
                        <span className="text-slate-900 dark:text-slate-100">{formatDate(customerToDelete.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">
                    {t('accounts.cannotBeUndone')}
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancelDelete}
                    className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
                  >
                    {t('accounts.cancel')}
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {t('accounts.deleteCustomer')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Action Modal */}
        {showPhoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                {t('accounts.contactCustomer')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {t('accounts.contactMethod', { phone: selectedPhone })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePhoneAction('call')}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                >
                  {t('accounts.phoneCall')}
                </button>
                <button
                  onClick={() => handlePhoneAction('whatsapp')}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                >
                  {t('accounts.whatsapp')}
                </button>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="w-full mt-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 font-medium"
              >
                {t('accounts.cancel')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
