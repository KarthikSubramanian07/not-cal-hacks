/**
 * Splits the built shell into the two documents Pages actually serves.
 *
 * The app is a single-page app, which normally means a crawler receives an
 * empty div and has to run JavaScript to see anything. So `dist/index.html`
 * gets the landing page rendered into it at build time: the one page that
 * matters for search arrives complete, and a real visitor gets meaningful
 * pixels before hydration.
 *
 * `dist/app.html` is the same document with `#root` left empty. `_redirects`
 * points every non-asset path at it, so /login and /admin never download,
 * parse, and then discard thirty kilobytes of landing-page markup. Serving one
 * document for both jobs is what forces a page to delete its own DOM on boot.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { LandingPage } from '../src/routes/landing'
import { AuthProvider } from '../src/lib/auth'

const LANDING = 'dist/index.html'
const SHELL = 'dist/app.html'
const ROOT = '<div id="root"></div>'

function main() {
  const template = readFileSync(LANDING, 'utf8')

  if (!template.includes(ROOT)) {
    throw new Error('prerender: could not find the root element in dist/index.html')
  }

  const html = renderToString(
    <StaticRouter location="/">
      {/* No session on a static render: the shell is the signed-out landing. */}
      <AuthProvider initialUser={null}>
        <LandingPage />
      </AuthProvider>
    </StaticRouter>,
  )

  writeFileSync(LANDING, template.replace(ROOT, `<div id="root">${html}</div>`))

  // The shell is an implementation detail of the router, not a page. Saying so
  // keeps it out of search results if a crawler ever requests it by name.
  writeFileSync(
    SHELL,
    template.replace(
      '<meta name="robots" content="index, follow, max-image-preview:large" />',
      '<meta name="robots" content="noindex" />',
    ),
  )

  console.log(
    `prerendered / into ${LANDING} (${(html.length / 1024).toFixed(1)} kB of markup), wrote ${SHELL}`,
  )
}

main()
