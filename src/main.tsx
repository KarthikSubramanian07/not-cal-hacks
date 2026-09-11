import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root')

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

/*
 * The landing page is prerendered to static HTML at build time, so at `/` we
 * hydrate the existing markup rather than throwing it away. Every other route
 * renders from scratch, because the served HTML is the landing page shell.
 */
if (window.location.pathname === '/' && container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
