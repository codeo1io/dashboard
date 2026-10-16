import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {ErrorBoundary} from './ErrorBoundary.tsx'
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
