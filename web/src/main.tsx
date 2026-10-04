import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// rm-514: one top-level boundary — a render crash in any view degrades to
// the pinned fallback instead of unmounting the tree to a blank page.
import {ErrorBoundary} from './components/ErrorBoundary.tsx'
import './index.css'

const rootElement = document.querySelector('#root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
