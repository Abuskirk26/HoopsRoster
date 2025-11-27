import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: ['.replit.dev'],
      hmr: {
        clientPort: 443,
        protocol: 'wss'
      }
    },
    define: {
      // Polyfill process.env.API_KEY for the Google GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    }
  }
})