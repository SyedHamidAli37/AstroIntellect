import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import MissionControlFallback from './components/MissionControlFallback'

// Global Cesium base URL (injected by vite.config.js define)
/* global CESIUM_BASE_URL */
if (typeof CESIUM_BASE_URL !== 'undefined') {
  window.CESIUM_BASE_URL = CESIUM_BASE_URL
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary
      fallback={(error) => (
        <MissionControlFallback
          orbitDetail={error?.message || 'Orbit viewer unavailable due to runtime error.'}
          missionDetail="Mission panel unavailable due to runtime error."
        />
      )}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
