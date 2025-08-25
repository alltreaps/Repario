/**
 * Example: How to Apply Role-Based Protection to User Management
 * 
 * This shows how to protect buttons within a page using the Can component
 * after applying the withManager HOC to the entire page.
 */

import { useState } from 'react';
import { Can } from './Can';
import { withManager } from '../hoc/withRole';
import { Plus, Edit3, Trash2 } from 'lucide-react';

function UserManagementExample() {
  const [users] = useState([
    { id: '1', name: 'John Doe', role: 'user' },
    { id: '2', name: 'Jane Smith', role: 'manager' },
  ]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        
        {/* Only admins can create users */}
        <Can ability="users.create">
          <button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </Can>
      </div>

      <div className="space-y-4">
        {users.map(user => (
          <div key={user.id} className="flex justify-between items-center p-4 border rounded">
            <div>
              <h3 className="font-medium">{user.name}</h3>
              <p className="text-gray-600">{user.role}</p>
            </div>
            
            <div className="flex gap-2">
              {/* Only admins can edit users */}
              <Can ability="users.edit">
                <button className="btn-secondary">
                  <Edit3 className="h-4 w-4" />
                </button>
              </Can>
              
              {/* Only admins can delete users */}
              <Can ability="users.delete">
                <button className="btn-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </Can>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Apply manager-level protection to entire page
// Managers can view users, but only admins can create/edit/delete (via Can components above)
export default withManager()(UserManagementExample);

/**
 * Usage in Router:
 * 
 * import ProtectedUserManagement from './components/UserManagementExample';
 * import BusinessSettingsPage from './components/BusinessSettingsPage';
 * 
 * // In your router:
 * <Route path="/users" element={<ProtectedUserManagement />} />
 * <Route path="/settings/business" element={<BusinessSettingsPage />} />
 * 
 * Access Control Summary:
 * - /users: Requires 'manager' role to view page
 *   - Create button: Requires 'users.create' ability (admin only)
 *   - Edit button: Requires 'users.edit' ability (admin only)  
 *   - Delete button: Requires 'users.delete' ability (admin only)
 * 
 * - /settings/business: Requires 'admin' role to access
 *   - Save button: Requires 'layouts.edit' ability (admin only)
 */
