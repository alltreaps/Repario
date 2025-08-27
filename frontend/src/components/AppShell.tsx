import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useLayoutContext } from '../contexts/LayoutContext'
import { cn } from '../lib/utils'
import {
  HomeIcon,
  DocumentTextIcon,
  RectangleGroupIcon,
  CubeIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  BoltIcon
} from '@heroicons/react/24/solid'

interface AppShellProps {
  children: ReactNode
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/home',
    icon: <HomeIcon className="w-5 h-5" />,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: <DocumentTextIcon className="w-5 h-5" />,
    children: [
      { name: 'New Invoice', href: '/invoices/new' },
      { name: 'History', href: '/invoices/history' },
    ],
  },
  {
    name: 'Layouts',
    href: '/layouts',
    icon: <RectangleGroupIcon className="w-5 h-5" />,
  },
  {
    name: 'Inventory',
    href: '/items',
    icon: <CubeIcon className="w-5 h-5" />,
  },
  {
    name: 'Clients',
    href: '/accounts',
    icon: <UsersIcon className="w-5 h-5" />,
  },
  {
    name: 'Users',
    href: '/users',
    icon: <UserGroupIcon className="w-5 h-5" />,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: <Cog6ToothIcon className="w-5 h-5" />,
  },
]

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { currentLayoutName } = useLayoutContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Invoices'])
  const { isDark, toggleTheme } = useTheme()

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const isActive = (href: string) => {
    if (href === '/home') {
      return location.pathname === '/home' || location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  const isChildActive = (childHref: string) => {
    return location.pathname === childHref
  }

  const getPageName = (pathname: string) => {
    switch (pathname) {
      case '/home':
        return 'Dashboard'
      case '/invoices/new':
        return 'New Invoice'
      case '/invoices/history':
        return 'Invoice History'
      case '/items':
        return 'Inventory'
      case '/layouts':
        return 'Layouts'
      case '/accounts':
        return 'Clients'
      case '/users':
        return 'User Management'
      default:
        if (pathname.startsWith('/layouts/')) {
          return currentLayoutName || 'Layout Designer'
        }
        if (pathname.startsWith('/invoices/edit/')) {
          return 'Edit Invoice'
        }
        if (pathname.startsWith('/accounts/history/')) {
          return currentLayoutName || 'Customer History'
        }
        if (pathname.startsWith('/invoices')) {
          return 'Invoices'
        }
        return 'Repario'
    }
  }

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
            <Link to="/home" className="flex items-center space-x-2">
              <BoltIcon className="w-6 h-6 text-yellow-500" />
              <span className="text-2xl font-bold text-blue-600 leading-tight">
                Repario
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      <div className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </div>
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expandedItems.includes(item.name) ? "rotate-90" : ""
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {expandedItems.includes(item.name) && (
                      <div className="mt-2 ml-6 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-lg transition-colors",
                              isChildActive(child.href)
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-l-2 border-blue-500"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-300"
                            )}
                            onClick={() => {
                              if (window.innerWidth < 1024) setSidebarOpen(false);
                            }}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
          {/* Theme toggle fixed above user section */}
          <div className="px-4 pb-4">
            {/* Theme toggle */}
            <div className="mb-0">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md border border-slate-200/50 dark:border-slate-500/30"
                title="Toggle dark mode"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-300",
                    isDark ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-600"
                  )}>
                    {isDark ? (
                      <MoonIcon className="w-4 h-4" />
                    ) : (
                      <SunIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {isDark ? 'Dark mode' : 'Light mode'}
                  </span>
                </div>
                
                {/* Custom toggle switch */}
                <div className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-inner",
                  isDark 
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/20" 
                    : "bg-gradient-to-r from-slate-300 to-slate-400 shadow-slate-400/20"
                )}>
                  <div
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 border-2",
                      isDark 
                        ? "translate-x-5 border-blue-200 shadow-blue-500/30" 
                        : "translate-x-0.5 border-slate-200 shadow-slate-500/20"
                    )}
                  >
                    {/* Inner icon */}
                    <div className="flex items-center justify-center h-full">
                      {isDark ? (
                        <div className="w-2 h-2 bg-blue-500 rounded-full opacity-60"></div>
                      ) : (
                        <div className="w-2 h-2 bg-amber-400 rounded-full opacity-60"></div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* User menu */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0 h-8 w-8">
                  {user?.logo_url ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <img
                        src={user.logo_url}
                        alt="Profile"
                        className="h-8 w-8 object-cover"
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {user?.fullName || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || 'No email'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
        {/* Top bar */}
        <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 lg:hidden">
          <div className="relative flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* App name - absolutely centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
              <BoltIcon className="w-5 h-5 text-yellow-500" />
              <span className="text-xl font-bold text-blue-600 leading-tight">
                Repario
              </span>
            </div>
            
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 z-10">
              {location.pathname === '/settings' ? 'Settings' : getPageName(location.pathname)}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  )
}
