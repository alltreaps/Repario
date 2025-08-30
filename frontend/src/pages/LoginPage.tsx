import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Mail, Lock, User, Shield, Building, Phone, Plus, Copy, Check, Globe } from 'lucide-react';
import { z } from 'zod';

// Validation schemas will be defined inside the component with translations

export default function LoginPage() {
  const { t, isRTL, setLanguage, currentLanguage } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [createNewBusiness, setCreateNewBusiness] = useState(false);
  const [generatedBusinessId, setGeneratedBusinessId] = useState('');
  const [showGeneratedId, setShowGeneratedId] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Helper functions for RTL-aware classes
  const getIconPosition = () => isRTL ? 'right-0 pr-2' : 'left-0 pl-2';
  const getInputPadding = () => isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3';
  const getPasswordIconPosition = () => isRTL ? 'left-0 pl-2' : 'right-0 pr-2';
  const getPasswordInputPadding = () => isRTL ? 'pl-10 pr-10' : 'pr-10 pl-10';
  const getSpaceBetween = () => isRTL ? 'space-x-reverse' : 'space-x-4';
  const getTextAlign = () => isRTL ? 'text-right' : 'text-left';

  // Validation schemas with translations
  const registerExistingBusinessSchema = z.object({
    email: z.string().email(t('auth.validation.emailRequired')),
    password: z.string().min(6, t('auth.validation.passwordMinLength')),
    fullName: z.string().min(1, t('auth.validation.fullNameRequired')),
    phone: z.string().min(1, t('auth.validation.phoneRequired')),
    businessId: z.string().uuid(t('auth.validation.businessIdRequired'))
  });

  const registerNewBusinessSchema = z.object({
    email: z.string().email(t('auth.validation.emailRequired')),
    password: z.string().min(6, t('auth.validation.passwordMinLength')),
    fullName: z.string().min(1, t('auth.validation.fullNameRequired')),
    phone: z.string().min(1, t('auth.validation.phoneRequired')),
    businessName: z.string().min(1, t('auth.validation.businessNameRequired'))
  });

  const loginSchema = z.object({
    email: z.string().email(t('auth.validation.emailRequired')),
    password: z.string().min(1, t('auth.validation.passwordRequired'))
  });

  // Multi-tenant registration function for existing business
  const registerWithBusiness = async (email: string, password: string, fullName: string, phone: string, businessId: string) => {
    // First, sign up the user with Supabase Auth (auto-confirm email for development)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined // Disable email confirmation redirect
      }
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('User creation failed');
    }

    // Wait a moment for the user to be fully created in the database
    await new Promise(resolve => setTimeout(resolve, 100));

    // Then insert into profiles table with business relationship
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        business_id: businessId,
        full_name: fullName,
        phone: phone,
        role: 'user',
        email: email // for backward compatibility
      });

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    // Profile created successfully
    // Note: User needs to confirm email before signing in
    console.log('User profile created successfully for business:', businessId);
  };

  // New business creation function
  const registerWithNewBusiness = async (email: string, password: string, fullName: string, businessName: string) => {
    // Call backend endpoint for business registration (bypasses email confirmation)
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/register-business`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        businessName
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await response.json();
    console.log('Business registration successful:', data);
    
    // Store the generated business ID to show to user
    setGeneratedBusinessId(data.user.business_id);
    setShowGeneratedId(true);

    return data.user.business_id;
  };

  // Copy business ID to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      if (isRegistering) {
        if (createNewBusiness) {
          // Validate new business registration form
          const formData = {
            email,
            password,
            fullName,
            phone,
            businessName
          };
          
          const validation = registerNewBusinessSchema.safeParse(formData);
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

          await registerWithNewBusiness(email, password, fullName, businessName);
        } else {
          // Validate existing business registration form
          const formData = {
            email,
            password,
            fullName,
            phone,
            businessId
          };
          
          const validation = registerExistingBusinessSchema.safeParse(formData);
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

          await registerWithBusiness(email, password, fullName, phone, businessId);
        }
      } else {
        // Validate login form
        const formData = { email, password };
        const validation = loginSchema.safeParse(formData);
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

        await login(email, password);
      }
      
      // Don't redirect immediately if we're showing the generated business ID  
      if (!showGeneratedId && !isRegistering) {
        console.log('Authentication successful, redirecting to dashboard...');
        navigate('/dashboard', { replace: true });
      } else if (isRegistering && !showGeneratedId) {
        // Registration completed successfully
        if (createNewBusiness) {
          // Backend registration with business creation - user is already confirmed
          // The showGeneratedId should be true, but if not, just redirect
          console.log('Backend registration completed, but no business ID to show');
          navigate('/dashboard', { replace: true });
        } else {
          // Traditional registration - need email confirmation
          setError(''); // Clear any errors
          setIsSubmitting(false);
          // Switch to login mode to allow user to sign in
          setIsRegistering(false);
          // Show helpful message
          setError(t('auth.registrationSuccess'));
          return; // Don't redirect, let user sign in
        }
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      
      let errorMessage = t('auth.unexpectedError');
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('429') || err.message.includes('Too Many Requests')) {
          errorMessage = t('auth.tooManyAttempts');
        } else if (err.message.includes('Invalid login credentials')) {
          errorMessage = t('auth.invalidCredentials');
        } else if (err.message.includes('Email rate limit exceeded')) {
          errorMessage = t('auth.emailRateLimit');
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = t('auth.emailNotConfirmed');
        } else if (err.message.includes('foreign key constraint')) {
          errorMessage = t('auth.registrationProcessing');
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setFieldErrors({});
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setBusinessId('');
    setBusinessName('');
    setCreateNewBusiness(false);
    setShowGeneratedId(false);
    setGeneratedBusinessId('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900">
      <div className="relative w-full max-w-md z-10">
        {/* Main card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 space-y-8 transition-all duration-300 relative">
          {/* Language switcher in top right corner */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setLanguage(currentLanguage === 'en' ? 'ar' : 'en')}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              title={`Switch to ${currentLanguage === 'en' ? 'العربية' : 'English'}`}
            >
              <Globe className="w-5 h-5" />
            </button>
          </div>
          {/* Logo and header */}
          <div className="text-center space-y-4">
            {/* Logo and app name in one line */}
            <div className="flex items-center justify-center">
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
              <h1 className={`text-4xl font-bold text-blue-600 dark:text-blue-400 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                Repario
              </h1>
            </div>
            
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                {isRegistering
                  ? (createNewBusiness
                      ? t('auth.createBusinessAccount')
                      : t('auth.joinExistingBusiness'))
                  : t('auth.welcomeDashboard')
                }
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <>
                {/* Business Creation Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center">
                    <Plus className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className={`${isRTL ? 'pr-3' : 'pl-8'}`}>
                      <label htmlFor="createNewBusiness" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t('auth.createNewBusiness')}
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('auth.startFreshBusiness')}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="createNewBusiness"
                      type="checkbox"
                      className="sr-only peer"
                      checked={createNewBusiness}
                      onChange={(e) => {
                        setCreateNewBusiness(e.target.checked);
                        setFieldErrors({});
                        setBusinessId('');
                        setBusinessName('');
                      }}
                    />
                    <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full ${isRTL ? 'peer-checked:after:-translate-x-full' : 'peer-checked:after:translate-x-full'} after:content-[''] after:absolute after:top-[2px] ${isRTL ? 'after:right-[2px]' : 'after:left-[2px]'} after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600`}></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('auth.fullName')}
                  </label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 ${getIconPosition()} flex items-center pointer-events-none z-10`}>
                      <User className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full ${getInputPadding()} py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                        fieldErrors.fullName 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                      placeholder={t('auth.enterFullName')}
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('auth.phoneNumber')}
                  </label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 ${getIconPosition()} flex items-center pointer-events-none z-10`}>
                      <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                    </div>
                    <div className={`absolute inset-y-0 ${isRTL ? 'left-3' : 'left-10'} flex items-center pointer-events-none z-10`}>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 px-1 py-1 rounded-md">
                        +964
                      </span>
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      dir="ltr"
                      value={phone}
                      onChange={(e) => {
                        // Only allow digits and limit to 10 characters
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(value);
                      }}
                      className={`w-full ${isRTL ? 'pr-10 pl-24' : 'pl-24 pr-3'} py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 text-left ${
                        fieldErrors.phone 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                      placeholder={t('auth.enterPhoneNumber')}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Conditional Business Fields */}
                {createNewBusiness ? (
                  <div className="space-y-2">
                    <label htmlFor="businessName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {t('auth.businessName')}
                    </label>
                    <div className="relative group">
                      <div className={`absolute inset-y-0 ${getIconPosition()} flex items-center pointer-events-none z-10`}>
                        <Building className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                      </div>
                      <input
                        id="businessName"
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className={`w-full ${getInputPadding()} py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                          fieldErrors.businessName 
                            ? 'border-red-300 dark:border-red-600' 
                            : 'border-slate-200 dark:border-slate-600'
                        }`}
                        placeholder={t('auth.enterBusinessName')}
                      />
                    </div>
                    {fieldErrors.businessName && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.businessName}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('auth.adminBusinessNote')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="businessId" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {t('auth.businessId')}
                    </label>
                    <div className="relative group">
                      <div className={`absolute inset-y-0 ${getIconPosition()} flex items-center pointer-events-none z-10`}>
                        <Building className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                      </div>
                      <input
                        id="businessId"
                        type="text"
                        value={businessId}
                        onChange={(e) => setBusinessId(e.target.value)}
                        className={`w-full ${getInputPadding()} py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                          fieldErrors.businessId 
                            ? 'border-red-300 dark:border-red-600' 
                            : 'border-slate-200 dark:border-slate-600'
                        }`}
                        placeholder={t('auth.enterBusinessId')}
                      />
                    </div>
                    {fieldErrors.businessId && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.businessId}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('auth.getBusinessIdNote')}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('auth.emailAddress')}
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 ${getIconPosition()} flex items-center pointer-events-none z-10`}>
                  <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${getInputPadding()} py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                    fieldErrors.email 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder={t('auth.enterEmail')}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('common.password')}
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 ${getIconPosition()} flex items-center pointer-events-none z-10`}>
                  <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${getPasswordInputPadding()} py-4 bg-slate-50/80 dark:bg-slate-700/80 border rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80 ${
                    fieldErrors.password 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder={t('auth.enterPassword')}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${getPasswordIconPosition()} flex items-center text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors z-10`}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
              )}
              {isRegistering && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('auth.passwordMinLength')}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 px-5 py-4 rounded-2xl flex items-center space-x-3 backdrop-blur-sm">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div className={`${getTextAlign()}`}>
                  <p className="text-sm font-medium">{t('auth.authenticationError')}</p>
                  <p className="text-xs opacity-90 mt-1">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:transform-none disabled:shadow-lg flex items-center justify-center ${getSpaceBetween()} group`}
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              )}
              <span className={`text-lg ${isRTL ? 'pr-3' : 'pl-3'}`}>
                {isSubmitting
                  ? (isRegistering
                      ? (createNewBusiness ? t('auth.creatingBusiness') : t('auth.creatingAccount'))
                      : t('auth.signingIn'))
                  : (isRegistering
                      ? (createNewBusiness ? t('auth.createBusiness') : t('auth.joinBusiness'))
                      : t('auth.signIn'))
                }
              </span>
              {!isSubmitting && (
                <div className={`w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ${isRTL ? 'ml-3' : 'mr-3'}`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          </form>

          {/* Generated Business ID Display */}
          {showGeneratedId && generatedBusinessId && (
            <div className="p-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-2xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    {t('auth.businessCreatedSuccess')}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('auth.businessSetupComplete')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    {t('auth.yourBusinessId')}
                  </label>
                  <div className={`flex items-center ${getSpaceBetween()}`}>
                    <div className="flex-1 p-3 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-600 rounded-xl font-mono text-sm text-slate-900 dark:text-slate-100">
                      {generatedBusinessId}
                    </div>
                    <button
                      onClick={() => copyToClipboard(generatedBusinessId)}
                      className={`flex items-center ${getSpaceBetween()} px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 hover:scale-105`}
                    >
                      {copiedToClipboard ? (
                        <>
                          <Check className="h-4 w-4 flex-shrink-0" />
                          <span className={`text-sm font-medium ${isRTL ? 'pr-2' : 'pl-2'}`}>{t('auth.copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 flex-shrink-0" />
                          <span className={`text-sm font-medium ${isRTL ? 'pr-2' : 'pl-2'}`}>{t('auth.copy')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/30 p-3 rounded-xl">
                  <p className="font-medium mb-1">{t('auth.important')}</p>
                  <ul className="space-y-1 pl-4">
                    <li>{t('auth.saveBusinessId')}</li>
                    <li>{t('auth.findIdLater')}</li>
                    <li>{t('auth.adminPermissions')}</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowGeneratedId(false);
                    navigate('/dashboard', { replace: true });
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
                >
                  {t('auth.continueDashboard')}
                </button>
              </div>
            </div>
          )}

          {/* Toggle mode */}
          <div className="text-center pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={toggleMode}
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-all duration-200 px-4 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {isRegistering
                ? t('auth.alreadyHaveAccount')
                : t('auth.needJoinCreate')
              }
            </button>
          </div>
        </div>

        {/* Enhanced security badge */}
        <div className="mt-8 text-center">
          <div className={`inline-flex items-center ${getSpaceBetween()} text-sm text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-slate-200/50 dark:border-slate-700/50`}>
            <Shield className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <span className={`font-medium ${isRTL ? 'pr-5' : 'pl-3'}`}>{t('auth.enterpriseSecurity')}</span>
            <div className={`flex space-x-1 ${isRTL ? 'mr-5' : 'ml-1'}`}>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        </div>

        {/* Company footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.copyright')}
          </p>
        </div>
      </div>
    </div>
  );
}
