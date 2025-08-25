const wsBase = (import.meta.env.VITE_WS_URL || '').replace(/\/$/, '')
const apiPrefix = import.meta.env.VITE_API_PREFIX || '/api'

export function makeSocket(path: string) {
  const full = `${wsBase}${apiPrefix}${path.startsWith('/') ? path : '/' + path}`
  return new WebSocket(full)
}
