import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CHALLENGE_BUTTON_DEFAULT =
  'https://api.withchallenge.com/widget/dist/challenge-button.js'

/** Replace %VITE_CHALLENGE_BUTTON_URL% in index.html with the env var or production CDN */
function challengeButtonUrl(): Plugin {
  return {
    name: 'challenge-button-url',
    transformIndexHtml(html) {
      const url = process.env.VITE_CHALLENGE_BUTTON_URL || CHALLENGE_BUTTON_DEFAULT
      return html.replace('%VITE_CHALLENGE_BUTTON_URL%', url)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), challengeButtonUrl()],
  server: {
    proxy: {
      '/api/challenge': {
        target: 'http://localhost:3847',
        changeOrigin: true,
      },
    },
  },
})
