import { useTranslation } from '../contexts/LanguageContext'

export default function LoginPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="relative max-w-md w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 z-10">
        <div className="text-center mb-8">
          {/* Logo and app name in one line */}
          <div className="flex items-center justify-center space-x-4 mb-4">
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
            <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 leading-tight">
              Repario
            </h1>
          </div>
          
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">{t('auth.welcomeBack')}</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('auth.emailAddress')}
            </label>
            <input
              type="email"
              className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80"
              placeholder={t('auth.enterEmail')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('common.password')}
            </label>
            <input
              type="password"
              className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-600/80"
              placeholder={t('auth.enterPassword')}
            />
          </div>
          
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl text-lg">
            {t('auth.signIn')}
          </button>
        </div>
      </div>
    </div>
  )
}
