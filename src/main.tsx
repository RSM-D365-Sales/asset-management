import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { seedIfEmpty } from './data/seed'

// Seed the local (offline) database before first render so the UI always has data,
// even with no network connection.
seedIfEmpty().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {/* basename keeps routing working when hosted under /<repo>/ on GitHub Pages */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})
