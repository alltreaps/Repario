import { useCurrentUser, useCurrentBusiness } from '../contexts/SessionContext';

export default function ExampleUsageComponent() {
  const { profile, isLoading: userLoading, error: userError } = useCurrentUser();
  const { business, isLoading: businessLoading, error: businessError } = useCurrentBusiness();

  if (userLoading || businessLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading session...</span>
      </div>
    );
  }

  if (userError || businessError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-medium">Session Error</p>
        <p className="text-sm">{userError || businessError}</p>
      </div>
    );
  }

  if (!profile || !business) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        <p className="font-medium">Session not loaded</p>
        <p className="text-sm">Profile or business information is missing</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Current User</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p><span className="font-medium">Name:</span> {profile.full_name}</p>
          <p><span className="font-medium">Role:</span> {profile.role}</p>
          <p><span className="font-medium">ID:</span> {profile.id}</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">Current Business</h3>
        <div className="space-y-1 text-sm text-green-800">
          <p><span className="font-medium">Name:</span> {business.name}</p>
          <p><span className="font-medium">ID:</span> {business.id}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Permissions</h3>
        <div className="space-y-1 text-sm text-slate-700">
          <p>✅ Can view invoices</p>
          <p>✅ Can create invoices</p>
          {profile.role === 'admin' && <p>✅ Can manage users</p>}
          {(profile.role === 'admin' || profile.role === 'manager') && <p>✅ Can manage business settings</p>}
        </div>
      </div>
    </div>
  );
}
