export function resolveApiBase() {
  const explicit = import.meta.env.VITE_API_URL
  if (explicit) return explicit.replace(/\/$/, '')
  // fallback to same-origin
  return `${window.location.origin}`.replace(/\/$/, '')
}
