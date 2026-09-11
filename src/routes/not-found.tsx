import { Link } from 'react-router'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="max-w-md text-center">
          <p className="eyebrow">Error 404</p>
          <h1 className="display-lg mt-4">Nothing filed here</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
            This page does not exist, which is legally distinct from it having been deleted.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild>
              <Link to="/">Back to the front page</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/status">My status</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
