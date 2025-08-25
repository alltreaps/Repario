import { useState } from 'react';
import { Can } from './Can';
import { usePermissions } from '../hooks/usePermissions';
import { 
  Settings, 
  Save, 
  Building, 
  Mail, 
  Phone, 
  MapPin,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Bell,
  AlertTriangle,
  Trash2,
  UserCheck
} from 'lucide-react';

interface BusinessSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  currency: string;
  timezone: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
}

interface StatusMessage {
  id: string;
  event: string;
  message: string;
  enabled: boolean;
}

function BusinessSettingsPage() {
  const { can } = usePermissions();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Business Profile Settings
  const [settings, setSettings] = useState<BusinessSettings>({
    name: 'My Business',
    email: 'contact@mybusiness.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business St, City, State 12345',
    tax_id: '12-3456789',
    currency: 'USD',
    timezone: 'America/New_York'
  });

  // WhatsApp Templates
  const [templates] = useState<WhatsAppTemplate[]>([
    {
      id: '1',
      name: 'Invoice Created',
      message: 'Hi {{customer_name}}, your invoice #{{invoice_number}} for {{amount}} has been created.',
      variables: ['customer_name', 'invoice_number', 'amount']
    },
    {
      id: '2', 
      name: 'Payment Reminder',
      message: 'Hi {{customer_name}}, this is a reminder that your invoice #{{invoice_number}} is due on {{due_date}}.',
      variables: ['customer_name', 'invoice_number', 'due_date']
    }
  ]);

  // Status Messages
  const [statusMessages] = useState<StatusMessage[]>([
    { id: '1', event: 'invoice_created', message: 'Invoice has been created successfully', enabled: true },
    { id: '2', event: 'invoice_sent', message: 'Invoice has been sent to customer', enabled: true },
    { id: '3', event: 'payment_received', message: 'Payment has been received', enabled: false }
  ]);

  // Loading states for each section
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Handler functions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ 
        type: 'success', 
        text: 'Business profile updated successfully!' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTemplates(true);
    setMessage(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ 
        type: 'success', 
        text: 'WhatsApp templates updated successfully!' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to update templates. Please try again.' 
      });
    } finally {
      setSavingTemplates(false);
    }
  };

  const handleSaveStatusMessages = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStatus(true);
    setMessage(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ 
        type: 'success', 
        text: 'Status messages updated successfully!' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to update status messages. Please try again.' 
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!window.confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Business deleted successfully');
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to delete business. Please try again.' 
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!window.confirm('Are you sure you want to transfer ownership? You will lose admin access.')) {
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Ownership transfer initiated');
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to transfer ownership. Please try again.' 
      });
    }
  };

  const handleInputChange = (field: keyof BusinessSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Business Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your business information, templates, and preferences
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200' 
              : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Section 1: Business Profile - Manager+ */}
          <Can ability="business.edit" fallback={
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
              <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Only managers and administrators can edit business settings
              </p>
            </div>
          }>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <form onSubmit={handleSaveProfile}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Business Profile
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Basic business information and contact details
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Business Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={settings.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!can('business.edit')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        value={settings.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!can('business.edit')}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        id="phone"
                        value={settings.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!can('business.edit')}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea
                        id="address"
                        value={settings.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        disabled={!can('business.edit')}
                        rows={3}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Tax ID */}
                  <div>
                    <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tax ID / EIN
                    </label>
                    <input
                      type="text"
                      id="tax_id"
                      value={settings.tax_id}
                      onChange={(e) => handleInputChange('tax_id', e.target.value)}
                      disabled={!can('business.edit')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Currency & Timezone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        id="currency"
                        value={settings.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        disabled={!can('business.edit')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                        disabled={!can('business.edit')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    type="submit"
                    disabled={!can('business.edit') || savingProfile}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {savingProfile ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Can>

          {/* Section 2: WhatsApp Templates - Manager+ */}
          <Can ability="business.edit" fallback={
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Only managers and administrators can edit WhatsApp templates
              </p>
            </div>
          }>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <form onSubmit={handleSaveTemplates}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp Templates
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Configure automated WhatsApp message templates
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {templates.map((template, index) => (
                    <div key={template.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          Template #{index + 1}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Message Template
                          </label>
                          <textarea
                            value={template.message}
                            disabled={!can('business.edit')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Enter your WhatsApp message template..."
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Available variables: {template.variables.map(v => `{{${v}}}`).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    type="submit"
                    disabled={!can('business.edit') || savingTemplates}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {savingTemplates ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Templates
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Can>

          {/* Section 3: Status Messages - Manager+ */}
          <Can ability="business.edit" fallback={
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Only managers and administrators can edit status messages
              </p>
            </div>
          }>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <form onSubmit={handleSaveStatusMessages}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Status Messages
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Configure system status and notification messages
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  {statusMessages.map((statusMsg) => (
                    <div key={statusMsg.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                            {statusMsg.event.replace('_', ' ')}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            statusMsg.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {statusMsg.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={statusMsg.message}
                          disabled={!can('business.edit')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Enter status message..."
                        />
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={statusMsg.enabled}
                            disabled={!can('business.edit')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    type="submit"
                    disabled={!can('business.edit') || savingStatus}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {savingStatus ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Messages
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Can>

          {/* Section 4: Danger Zone - Admin Only */}
          <Can ability="business.delete" fallback={
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-600 dark:text-red-400">
                Only administrators can access dangerous business operations
              </p>
            </div>
          }>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="px-6 py-4 border-b border-red-200 dark:border-red-800">
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Irreversible actions that affect your entire business
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Transfer Ownership */}
                <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-white dark:bg-red-900/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Transfer Ownership
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Transfer business ownership to another administrator. You will lose admin access.
                      </p>
                    </div>
                    <button
                      onClick={handleTransferOwnership}
                      disabled={!can('business.transfer')}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      Transfer
                    </button>
                  </div>
                </div>

                {/* Delete Business */}
                <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-white dark:bg-red-900/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Business
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Permanently delete this business and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteBusiness}
                      disabled={!can('business.delete')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Can>
        </div>
      </div>
    </div>
  );
}

// Remove admin-only protection since we now have granular section-based permissions
export default BusinessSettingsPage;
