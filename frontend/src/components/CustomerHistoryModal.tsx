import { useState, useEffect } from 'react'
import { XMarkIcon, ClockIcon, DocumentTextIcon, CurrencyDollarIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { fetchCustomerHistory } from '../lib/api'

interface CustomerHistoryModalProps {
  customerId: string | null
  customerName: string
  isOpen: boolean
  onClose: () => void
}

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
    pending_invoices: number
    completed_invoices: number
    total_amount: number
  }
}

export default function CustomerHistoryModal({ customerId, customerName, isOpen, onClose }: CustomerHistoryModalProps) {
  const [historyData, setHistoryData] = useState<CustomerHistoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && customerId) {
      loadCustomerHistory()
    }
  }, [isOpen, customerId])

  const loadCustomerHistory = async () => {
    if (!customerId) return

    try {
      setLoading(true)
      setError(null)
      const data = await fetchCustomerHistory(customerId)
      setHistoryData(data)
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
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customer History</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">{customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Invoices</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{historyData.stats.total_invoices}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <ClockIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{historyData.stats.pending_invoices}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{historyData.stats.completed_invoices}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Value</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(historyData.stats.total_amount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Activity Timeline</h3>
                {historyData.timeline.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No activity found for this customer</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyData.timeline.map((event, index) => (
                      <div key={`${event.invoice_id}-${event.date}-${index}`} className="flex items-start space-x-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-600 rounded-full">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {event.type === 'invoice_created' ? 'Invoice Created' : 'Status Updated'}
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                {getStatusIcon(event.status)}
                                <span className="ml-1">{event.status.charAt(0).toUpperCase() + event.status.slice(1)}</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatCurrency(event.amount)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.date)}</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Invoice #{event.invoice_id.slice(0, 8)}... - {event.message}
                          </p>
                          {event.extra_note && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">
                              Note: {event.extra_note}
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
    </div>
  )
}
