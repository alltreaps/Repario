import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClockIcon, DocumentTextIcon, CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { fetchCustomerHistory } from '../lib/api'
import { useLayoutContext } from '../contexts/LayoutContext'

interface TimelineEvent {
  type: 'invoice_created' | 'status_change'
  invoice_id: string
  status: string
  amount: number
  date: string
  message: string
  extra_note?: string
}

interface CustomerHistoryData {
  customer: {
    id: string
    name: string
  }
  invoices: any[]
  timeline: TimelineEvent[]
  stats: {
    total_invoices: number
    refused_invoices: number
    completed_invoices: number
    total_amount: number
  }
}

export default function CustomerHistoryPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const { setCurrentLayoutName } = useLayoutContext()
  const [historyData, setHistoryData] = useState<CustomerHistoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customerId) {
      loadCustomerHistory()
    }
  }, [customerId])

  const loadCustomerHistory = async () => {
    if (!customerId) return

    try {
      setLoading(true)
      setError(null)
      const data = await fetchCustomerHistory(customerId)
      setHistoryData(data)
      // Set customer name in navbar like LayoutDesignerPage does
      if (data?.customer?.name) {
        setCurrentLayoutName(data.customer.name)
      }
    } catch (err: any) {
      console.error('Error loading customer history:', err)
      setError(err.message || 'Failed to load customer history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleExport = () => {
    if (!historyData) return
    
    // Create CSV content
    const csvContent = [
      ['Invoice ID', 'Type', 'Status', 'Amount', 'Date', 'Message'].join(','),
      ...historyData.timeline.map(event => [
        event.invoice_id.slice(0, 8),
        event.type === 'invoice_created' ? 'Created' : 'Status Change',
        event.status,
        event.amount,
        formatDate(event.date),
        `"${event.message}"`
      ].join(','))
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${historyData.customer.name}-history.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'refused':
        return <XCircleIcon className="w-4 h-4 text-red-600" />
      case 'working':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path fill="white" d="M12 8v4l3 3" strokeWidth="1.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      case 'pending':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="16" r="1" fill="white" />
            <path d="M12 8v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-600" />
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return <DocumentTextIcon className="w-5 h-5 text-blue-600" />
      case 'status_change':
        return <ClockIcon className="w-5 h-5 text-orange-600" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="p-4 sm:p-6" data-customer-name={historyData?.customer?.name}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="hidden md:block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
              Customer History
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              {historyData?.customer?.name || 'Loading...'}
            </p>
          </div>
          {historyData && (
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 w-full md:w-auto justify-center"
              title="Export History"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export History
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading customer history...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400">
              <p className="font-semibold text-lg">Error loading history</p>
              <p className="text-sm mt-2">{error}</p>
              <button
                onClick={loadCustomerHistory}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : historyData ? (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Invoices</p>
                    <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{historyData.stats.total_invoices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <XCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Refused</p>
                    <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{historyData.stats.refused_invoices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                    <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{historyData.stats.completed_invoices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <CurrencyDollarIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-3 md:ml-4">
                    <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Value</p>
                    <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(historyData.stats.total_amount)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 sm:mb-6">Activity Timeline</h3>
              {historyData.timeline.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-lg">No activity found for this customer</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Invoice history will appear here once created</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                  {historyData.timeline.map((event, index) => (
                    <div 
                      key={`${event.invoice_id}-${event.date}-${index}`} 
                      onClick={event.type === 'invoice_created' ? () => navigate(`/invoices/edit/${event.invoice_id}`) : undefined}
                      className={`flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700 rounded-lg transition-colors ${
                        event.type === 'invoice_created' 
                          ? 'hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer group' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex-shrink-0 p-2 sm:p-3 bg-white dark:bg-slate-600 rounded-full shadow-sm">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                          <div className="flex justify-between items-start sm:items-center w-full sm:w-auto">
                            <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
                              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                                {event.type === 'invoice_created' ? 'Invoice Created' : 'Status Updated'}
                              </p>
                              <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(event.status)} w-fit`}>
                                {getStatusIcon(event.status)}
                                <span className="ml-1 sm:ml-1.5">{event.status.charAt(0).toUpperCase() + event.status.slice(1)}</span>
                              </span>
                            </div>
                            <div className="text-right sm:hidden">
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.date)}</p>
                              {event.type === 'invoice_created' && (
                                <p className="text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(event.amount)}</p>
                              )}
                            </div>
                          </div>
                          <div className="hidden sm:block text-right">
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{formatDate(event.date)}</p>
                            {event.type === 'invoice_created' && (
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(event.amount)}</p>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1 transition-colors ${
                          event.type === 'invoice_created' ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''
                        }`}>
                          <span className="font-medium">Invoice #{event.invoice_id.slice(0, 8)}...</span> - {event.message}
                          {event.type === 'invoice_created' && (
                            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400 hidden sm:inline">
                              → Click to view details
                            </span>
                          )}
                        </p>
                        {event.extra_note && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-600 p-2 rounded mt-2">
                            💬 {event.extra_note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
