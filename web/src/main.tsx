import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {ErrorBoundary} from './shell/ErrorBoundary.tsx'
import './index.css'

const rootElement = document.querySelector('#root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* rm-514: last-resort boundary — a render throw anywhere in the SPA
        renders the digest + reload fallback instead of a blank page. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
