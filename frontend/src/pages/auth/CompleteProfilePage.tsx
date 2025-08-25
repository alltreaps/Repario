import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { User, Building, Phone, Shield } from 'lucide-react';
import { z } from 'zod';

// Validation schema for profile completion
const completeProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  businessId: z.string().uuid('Please enter a valid business ID (UUID format)')
});

export default function CompleteProfilePage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      // Validate form data
      const formData = { fullName, phone, businessId };
      const validation = completeProfileSchema.safeParse(formData);
      
      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.issues.forEach((issue: any) => {
          if (issue.path[0]) {
            errors[issue.path[0] as string] = issue.message;
          }
        });
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if business exists
      const { error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .single();

      if (businessError) {
        if (businessError.code === 'PGRST116') {
          throw new Error('Business not found. Please check the Business ID.');
        }
        throw new Error(`Business lookup failed: ${businessError.message}`);
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          business_id: businessId,
          full_name: fullName,
          phone: phone,
          role: 'user',
          email: user.email || ''
        });

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Success - redirect to dashboard
      console.log('Profile created successfully, redirecting to dashboard...');
      navigate('/dashboard', { replace: true });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900">
      <div className="relative w-full max-w-md z-10">
        {/* Main card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 space-y-8 transition-all duration-300">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                <rect width="24" height="24" rx="6" fill="url(#gradient)"/>
                <path d="M13.5 2.25l-7.5 9h6l-1.5 10.5 7.5-9h-6l1.5-10.5z" fill="#fde047" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2563eb"/>
                    <stop offset="1" stopColor="#60a5fa"/>
                  </linearGradient>
                </defs>
              </svg>
              <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                Repario
              </h1>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Complete Your Profile
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                Join your business team to start managing invoices
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <User className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                    fieldErrors.fullName 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                    fieldErrors.phone 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder="Enter your phone number"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="businessId" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Business ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Building className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  id="businessId"
                  type="text"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                    fieldErrors.businessId 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder="Enter business UUID (e.g., 1e73fdc9-2cbd-487c-8c89-fb1f49d1feb6)"
                />
              </div>
              {fieldErrors.businessId && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.businessId}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Get the business ID from your business administrator
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 px-5 py-4 rounded-2xl flex items-center space-x-3 backdrop-blur-sm">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Profile Creation Error</p>
                  <p className="text-xs opacity-90 mt-1">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:transform-none disabled:shadow-lg flex items-center justify-center space-x-3 group"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              )}
              <span className="text-lg">
                {isSubmitting ? 'Completing Profile...' : 'Complete Profile'}
              </span>
              {!isSubmitting && (
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-slate-200/50 dark:border-slate-700/50">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Enterprise-grade security</span>
          </div>
        </div>

        {/* Company footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2025 Repario Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
