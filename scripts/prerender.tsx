/**
 * Prerenders the landing page to static HTML at build time.
 *
 * The app is a single-page app, which normally means a crawler receives an
 * empty div and has to run JavaScript to see anything. Rendering the landing
 * markup into `index.html` means the one page that matters for search arrives
 * complete, and a real visitor gets meaningful pixels before hydration.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { LandingPage } from '../src/routes/landing'
import { AuthProvider } from '../src/lib/auth'

const DIST = 'dist/index.html'

function main() {
  const template = readFileSync(DIST, 'utf8')

  const html = renderToString(
    <StaticRouter location="/">
      {/* No session on a static render: the shell is the signed-out landing. */}
      <AuthProvider initialUser={null}>
        <LandingPage />
      </AuthProvider>
    </StaticRouter>,
  )

  if (!template.includes('<div id="root"></div>')) {
    throw new Error('prerender: could not find the root element in dist/index.html')
  }

  writeFileSync(DIST, template.replace('<div id="root"></div>', `<div id="root">${html}</div>`))
  console.log(`prerendered / into ${DIST} (${(html.length / 1024).toFixed(1)} kB of markup)`)
}

main()
