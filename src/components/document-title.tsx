import { useEffect } from 'react'

const DEFAULT_TITLE = 'not-cal-hacks — Hackathon application portal'

/** Sets `document.title` for the current route and restores the default on leave. */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [title])

  return null
}
