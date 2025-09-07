// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to avoid Leaflet map initialization issues in development
  // <StrictMode>
    <App />
  // </StrictMode>,
)
