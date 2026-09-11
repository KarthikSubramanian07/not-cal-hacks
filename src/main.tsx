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
 * The landing page is prerendered to static HTML at build time. If markup is
 * already here, it is that render and we hydrate it instead of throwing it
 * away; every other route is served an empty shell and starts from scratch.
 * The document itself says which case this is, so there is no path list to
 * keep in sync with the router.
 */
if (container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
