import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {DevAuthMarker} from './shell/DevAuthMarker.tsx'
import './index.css'

const rootElement = document.querySelector('#root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    {/* rm-642: persistent dev-auth marker — renders only when the server
        injected the dev-auto-login meta (dev/fixture boots). */}
    <DevAuthMarker />
  </React.StrictMode>,
)
