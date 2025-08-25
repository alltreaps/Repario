import RequireRole from './RequireRole'
import { ShieldCheckIcon, CogIcon, UserGroupIcon } from '@heroicons/react/24/solid'

export default function RequireRoleDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          RequireRole Component Demo
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Examples of how to use the RequireRole component for permission-based UI
        </p>
      </div>

      {/* Example 1: Admin-only content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-green-600" />
          Admin-Only Content
        </h2>
        
        <RequireRole role="admin">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              🎉 You're an Admin!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              This content is only visible to users with admin role.
            </p>
            <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Admin Action
            </button>
          </div>
        </RequireRole>
      </div>

      {/* Example 2: Multiple roles */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <UserGroupIcon className="w-5 h-5 text-blue-600" />
          Multiple Roles
        </h2>
        
        <RequireRole role={["admin", "manager"]}>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Management Access
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              This content is visible to both admins and managers.
            </p>
            <div className="flex gap-2 mt-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Manager Action
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Advanced Settings
              </button>
            </div>
          </div>
        </RequireRole>
      </div>

      {/* Example 3: With redirect */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CogIcon className="w-5 h-5 text-purple-600" />
          Redirect Example
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          This would redirect non-admin users to dashboard instead of showing an error:
        </p>
        
        <code className="block bg-slate-100 dark:bg-slate-700 p-3 rounded text-sm">
          {`<RequireRole role="admin" redirect={true}>`}<br/>
          {`  <AdminOnlyPage />`}<br/>
          {`</RequireRole>`}
        </code>
      </div>

      {/* Example 4: Custom fallback */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4">Custom Fallback</h2>
        
        <RequireRole 
          role="superadmin" 
          fallback={
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ Superadmin Required
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                This feature requires superadmin privileges. Contact your administrator for access.
              </p>
            </div>
          }
        >
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
              🚀 Superadmin Panel
            </h3>
            <p className="text-purple-700 dark:text-purple-300">
              Ultra-sensitive controls only for superadmins.
            </p>
          </div>
        </RequireRole>
      </div>

      {/* Usage examples */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Basic Usage:</h3>
            <code className="block bg-white dark:bg-slate-800 p-3 rounded text-sm">
              {`<RequireRole role="admin">`}<br/>
              {`  <AdminButton />`}<br/>
              {`</RequireRole>`}
            </code>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Multiple Roles:</h3>
            <code className="block bg-white dark:bg-slate-800 p-3 rounded text-sm">
              {`<RequireRole role={["admin", "manager", "editor"]}>`}<br/>
              {`  <EditContent />`}<br/>
              {`</RequireRole>`}
            </code>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">With Redirect:</h3>
            <code className="block bg-white dark:bg-slate-800 p-3 rounded text-sm">
              {`<RequireRole role="admin" redirect={true}>`}<br/>
              {`  <FullPage />`}<br/>
              {`</RequireRole>`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
