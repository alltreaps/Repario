



let tokenRefreshTimer: NodeJS.Timeout | null = null;

// Proactive token refresh function (currently a no-op, left for future use)
export const scheduleTokenRefresh = () => {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
  // No-op: logic handled by backend/session or to be implemented if needed
};

// Cleanup function for logout
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
  console.log('🔒 Tokens cleared and refresh timer stopped');
};
