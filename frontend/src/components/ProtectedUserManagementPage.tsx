import UserManagementPageComponent from './UserManagementPage';
import { withManager } from '../hoc/withRole';

/**
 * Protected User Management Page
 * Requires manager role or higher to access
 * Within the page, create/edit/delete buttons require admin role
 */
export default withManager()(UserManagementPageComponent);
