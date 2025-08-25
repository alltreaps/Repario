import type { ReactNode } from 'react'
import { useSession } from '../hooks/useSession'
import { ShieldExclamationIcon, ArrowLeftIcon } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'

interface RequireRoleProps {
  /** Single role or array of roles that are allowed */
  role: string | string[]
  /** Content to render if user has required role */
  children: ReactNode
  /** Whether to redirect to dashboard instead of showing error message */
  redirect?: boolean
  /** Custom fallback component to render when not authorized */
  fallback?: ReactNode
}

export default function RequireRole({ 
  role, 
  children, 
  redirect = false, 
  fallback 
}: RequireRoleProps) {
  const sessionData = useSession()
  const navigate = useNavigate()

  // Show loading state while session is loading - render children normally
  if (sessionData.isLoading) {
    return <>{children}</>
  }

  // If no user is logged in, redirect to login
  if (!sessionData.user || !sessionData.profile) {
    if (redirect) {
      navigate('/login')
      return null
    }
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Please log in to access this page.
          </p>
        </div>
      </div>
    )
  }

  const userRole = sessionData.profile.role
  const allowedRoles = Array.isArray(role) ? role : [role]
  const hasRequiredRole = allowedRoles.includes(userRole)

  // If user doesn't have required role
  if (!hasRequiredRole) {
    if (redirect) {
      navigate('/dashboard')
      return null
    }

    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>
    }

    // Default not authorized UI
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <ShieldExclamationIcon className="w-10 h-10 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            Access Denied
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            You don't have permission to access this page. This page requires{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {allowedRoles.length === 1 ? `${allowedRoles[0]} role` : `one of: ${allowedRoles.join(', ')} roles`}
            </span>{' '}
            but you have{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {userRole} role
            </span>.
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // User has required role, render children
  return <>{children}</>
}
