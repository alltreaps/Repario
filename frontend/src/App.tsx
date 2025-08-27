import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LayoutProvider } from './contexts/LayoutContext'
import { SessionProvider } from './contexts/SessionContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/ui/Toast'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import CompleteProfilePage from './pages/auth/CompleteProfilePage'
import HomePage from './components/HomePage'
import NewInvoicePage from './components/NewInvoicePage'
import InvoiceHistoryPage from './components/InvoiceHistoryPage'
import ItemsPage from './components/ItemsPage'
import LayoutsPage from './components/LayoutsPage'
import LayoutDesignerPage from './components/LayoutDesignerPage'
import AccountsPage from './components/AccountsPage'
import CustomerHistoryPage from './components/CustomerHistoryPage'
import UsersPage from './components/UsersPage'
import SettingsPage from './components/SettingsPage'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LayoutProvider>
          <Router>
          <Routes>
            {/* Auth routes - standalone (no SessionProvider) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/complete-profile" element={<CompleteProfilePage />} />
            
            {/* Root redirect directly to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Protected routes with SessionProvider */}
            <Route path="/dashboard" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><HomePage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/invoices" element={<Navigate to="/invoices/history" replace />} />
            <Route path="/invoices/new" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><NewInvoicePage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/invoices/edit/:invoiceId" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><NewInvoicePage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/invoices/history" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><InvoiceHistoryPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/items" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><ItemsPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/layouts" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><LayoutsPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/layouts/:layoutId" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><LayoutDesignerPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/accounts" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><AccountsPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/accounts/history/:customerId" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><CustomerHistoryPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/users" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><UsersPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            <Route path="/settings" element={
              <SessionProvider>
                <ProtectedRoute>
                  <AppShell><SettingsPage /></AppShell>
                </ProtectedRoute>
              </SessionProvider>
            } />
            
            {/* Redirect unknown routes to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </LayoutProvider>
    </AuthProvider>
    </ToastProvider>
  )
}

export default App
