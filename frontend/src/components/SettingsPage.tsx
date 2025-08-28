import React, { useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  UserCircleIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/solid';
import { Can } from './Can';
import { getVersion } from '../version';

const SettingsPage: React.FC = () => {
  
  // Profile & Account
  const [name, setName] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const authLoading = auth?.isLoading ?? true;
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // Notifications & Messaging
  const [whatsappApiKey, setWhatsappApiKey] = React.useState('');
  const [statusMessages, setStatusMessages] = React.useState({
    pending: '',
    working: '',
    done: '',
    refused: '',
  });
  const [loadingStatusMessages, setLoadingStatusMessages] = React.useState(true);
  const [statusMessagesError, setStatusMessagesError] = React.useState<string | null>(null);

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchUserProfile() {
      setLoadingProfile(true);
      setProfileError(null);
      if (!user) {
        setProfileError('User not logged in.');
        setLoadingProfile(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, phone, logo_url')
        .eq('id', user.id)
        .single();
      if (error || !data) {
        setProfileError('User profile not found.');
      } else {
  setName(data.display_name || '');
  setPhone(data.phone || '');
  setLogoUrl(data.logo_url || '');
      }
      setLoadingProfile(false);
    }
    if (!authLoading) {
      fetchUserProfile();
    }
  }, [user, authLoading]);

  // Fetch status messages on mount
  useEffect(() => {
    async function fetchStatusMessages() {
      setLoadingStatusMessages(true);
      setStatusMessagesError(null);
      if (!user) {
        setStatusMessagesError('User not logged in.');
        setLoadingStatusMessages(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('invoice_status_settings')
        .select('status, default_message, allow_extra_note')
        .eq('user_id', user.id);
      
      if (error) {
        setStatusMessagesError('Failed to load status messages.');
      } else if (data) {
        const messages: any = {};
        
        // Initialize with empty values
        ['pending', 'working', 'done', 'refused'].forEach(status => {
          messages[status] = '';
        });
        
        // Fill with database values
        data.forEach((setting: any) => {
          messages[setting.status] = setting.default_message || '';
        });
        
        setStatusMessages(messages);
      }
      setLoadingStatusMessages(false);
    }
    
    if (!authLoading) {
      fetchStatusMessages();
    }
  }, [user, authLoading]);

  // Save profile changes
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name, phone, logo_url: logoUrl })
      .eq('id', user.id);
    if (!error) alert('Profile updated!');
    else alert('Error updating profile');
  };

  // Change password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
  if (!user) return;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (!error) alert('Password changed!');
  else alert('Error changing password');
  };

  // Save status messages to database
  const handleNotifSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      // Prepare data for upsert
      const statusSettings = ['pending', 'working', 'done', 'refused'].map(status => ({
        user_id: user.id,
        status,
        default_message: statusMessages[status as keyof typeof statusMessages],
        allow_extra_note: false, // Default to false
        send_whatsapp: true // Default to true
      }));
      
      // Upsert status settings
      const { error } = await supabase
        .from('invoice_status_settings')
        .upsert(statusSettings, {
          onConflict: 'user_id,status'
        });
      
      if (error) {
        alert('Error saving status messages: ' + error.message);
      } else {
        alert('Status messages saved successfully!');
      }
    } catch (error) {
      alert('Error saving status messages');
    }
  };

  // Logo upload handler (upload to Supabase Storage)
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      const filePath = `${user.id}/${file.name}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        setLogoUrl(urlData.publicUrl);
        // Save the public URL to the user's profile
        await supabase
          .from('profiles')
          .update({ logo_url: urlData.publicUrl })
          .eq('id', user.id);
      } else {
        alert('Error uploading image');
      }
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 px-2 py-4 sm:px-4 md:px-6">
  <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        {/* Hide page header on mobile, show only on md+ */}
        <div className="mb-6 md:mb-8 hidden sm:block">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-base sm:text-lg">
            Manage your account, preferences, notifications, and more
          </p>
        </div>

        {/* Profile & Account */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <UserCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Profile & Account</h2>
          </div>
          {loadingProfile ? (
            <div className="text-slate-500 dark:text-slate-400">Loading profile...</div>
          ) : profileError ? (
            <div className="text-red-600 dark:text-red-400">{profileError}</div>
          ) : (
          <form onSubmit={handleProfileSave} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-4 mb-4 items-center sm:items-start">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-2 flex justify-center sm:justify-start w-full">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute left-0 top-0 w-full h-full flex items-center justify-center rounded-full focus:outline-none"
                  style={{ background: logoUrl ? 'transparent' : 'rgba(255,255,255,0.6)', backdropFilter: logoUrl ? undefined : 'blur(8px)' }}
                >
                  {logoUrl ? (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="Shop Logo"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover"
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-200 flex items-center justify-center text-2xl text-slate-400">?</div>
                      <CameraIcon className="absolute w-8 h-8 text-slate-700" />
                    </>
                  )}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500 dark:text-slate-400">+964</span>
                    </div>
                    <input 
                      type="tel" 
                      className="w-full pl-16 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={phone.replace(/^\+964/, '')} 
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setPhone('+964' + value);
                      }} 
                      placeholder="7XXXXXXXXX" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold">Save Profile</button>
          </form>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-6 sm:mt-8">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <input type="password" className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={password} onChange={e => setPassword(e.target.value)} placeholder="Current password" />
              <input type="password" className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" />
            </div>
            <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold">Change Password</button>
          </form>
        </section>

        {/* Notifications & Messaging - WhatsApp Templates & Status Messages (Manager+ only) */}
        <Can ability="business.edit" fallback={
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6 md:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">WhatsApp Messages</h2>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                <ShieldExclamationIcon className="w-5 h-5 inline-block mr-2" />
                Manager or admin permissions required to modify messaging settings.
              </p>
            </div>
          </section>
        }>
  <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">WhatsApp Messages</h2>
          </div>
          {loadingStatusMessages ? (
            <div className="text-slate-500 dark:text-slate-400">Loading status messages...</div>
          ) : statusMessagesError ? (
            <div className="text-red-600 dark:text-red-400">{statusMessagesError}</div>
          ) : (
          <form onSubmit={handleNotifSave} className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">WhatsApp API Key</label>
                <input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={whatsappApiKey} onChange={e => setWhatsappApiKey(e.target.value)} placeholder="WhatsApp API Key" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {['pending','working','done','refused'].map(status => (
                <div
                  key={status}
                  className={
                    `border rounded-xl p-4 mb-2 ` +
                    (status === 'pending'
                      ? 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/40 dark:border-yellow-600'
                      : status === 'working'
                      ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/40 dark:border-blue-600'
                      : status === 'done'
                      ? 'bg-green-100 border-green-400 dark:bg-green-900/40 dark:border-green-600'
                      : status === 'refused'
                      ? 'bg-red-100 border-red-400 dark:bg-red-900/40 dark:border-red-600'
                      : 'bg-slate-50 dark:bg-slate-700')
                  }
                >
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 capitalize">{status} message</label>
                  <textarea className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={2} value={statusMessages[status as keyof typeof statusMessages]} onChange={e => setStatusMessages(m => ({...m, [status]: e.target.value}))} placeholder={`Message for ${status}`}/>
                </div>
              ))}
            </div>
            <button type="submit" className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold">Save Messages Settings</button>
          </form>
          )}
        </section>
        </Can>

        {/* App Version & Support */}
        <div className="mb-6 md:mb-8">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="mb-2 text-slate-700 dark:text-slate-300">Version: <span className="font-mono">{getVersion()}</span></div>
            <div className="mb-2 text-slate-700 dark:text-slate-300">Need help? <a href="mailto:support@repario.app" className="text-blue-600 underline">Contact Support</a></div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SettingsPage;
