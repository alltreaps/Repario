import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { openWhatsApp, composeStatusMessage } from '../lib/whatsapp'

interface WhatsAppMessagePopupProps {
  isOpen: boolean
  onClose: () => void
  customerName: string
  customerPhone: string
  invoiceId: string
  status: string
  statusTemplate: string
  allowExtraNote?: boolean
  initialExtraNote?: string
  onSend?: () => void
}

export default function WhatsAppMessagePopup({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  invoiceId,
  status,
  statusTemplate,
  allowExtraNote = true,
  initialExtraNote,
  onSend
}: WhatsAppMessagePopupProps) {
  const [extraNote, setExtraNote] = useState('')
  const [composedMessage, setComposedMessage] = useState('')

  // Update composed message when inputs change
  useEffect(() => {
    if (isOpen && statusTemplate) {
      const message = composeStatusMessage(
        statusTemplate,
        customerName,
        invoiceId,
        status,
        extraNote || undefined
      )
      setComposedMessage(message)
    }
  }, [isOpen, statusTemplate, customerName, invoiceId, status, extraNote])

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setExtraNote(initialExtraNote || '')
    }
  }, [isOpen, initialExtraNote])

  const handleSendMessage = () => {
    if (customerPhone && composedMessage) {
      openWhatsApp(customerPhone, composedMessage)
      onSend?.()
      onClose()
    }
  }

  const handleCancel = () => {
    setExtraNote('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Send WhatsApp Message</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  To: {customerName} ({customerPhone})
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              status === 'working' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              status === 'refused' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}>
              {status}
            </span>
          </div>

          {/* Extra Note Input */}
          {allowExtraNote && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                rows={3}
                placeholder="Add any extra message to include with the status update..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Message Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Message Preview
            </label>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                {composedMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!customerPhone || !composedMessage}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382"/>
            </svg>
            Send WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
