import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // This will show IP addresses
    port: 5173, // Default Vite port
    // For local development, proxy /api to localhost:3000 (http)
    // For production (online):
    //   - If using HTTP, backend should listen on port 80
    //   - If using HTTPS, backend should listen on port 443
    //   - Set VITE_API_URL to your domain (no port needed for standard 80/443) in .env.production
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
  },
})
