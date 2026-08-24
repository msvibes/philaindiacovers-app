// Self-hosted (not Google Fonts CDN — this app's CSP has no font-src/
// Google-Fonts allowance, and self-hosting also matches the app's own
// offline-first requirements). @fontsource bundles the actual Google
// Fonts .woff2 files under an OFL license; importing here lets Vite
// resolve the referenced font-file URLs through its normal asset pipeline.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import './assets/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
