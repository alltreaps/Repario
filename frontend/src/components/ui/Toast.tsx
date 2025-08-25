import { useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning'
  message: string
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

let toastContext: ToastContextType | null = null

export const useToast = () => {
  if (!toastContext) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return toastContext
}

export const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  if (toastContext) {
    toastContext.showToast(message, type)
  }
}

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { id, message, type }
    
    setToasts(prev => [...prev, newToast])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Set the global context
  toastContext = { showToast }

  return (
    <>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center p-4 rounded-lg shadow-lg min-w-80 max-w-md transform transition-all duration-300 ease-in-out
              ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : ''}
              ${toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : ''}
            `}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              )}
              {toast.type === 'error' && (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              )}
              {toast.type === 'warning' && (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              )}
            </div>
            
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">
                {toast.message}
              </p>
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
