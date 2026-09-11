import { useEffect } from 'react'
import { triggerHyperspaceJump } from './starfield'

/**
 * Press J anywhere in the product to jump to lightspeed.
 *
 * It does nothing except look good, which is the point. It is hinted at in the
 * footer fine print rather than documented, and it is ignored while anyone is
 * typing so it cannot eat a letter out of an essay.
 */
export function JumpKey() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'j') return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true
      if (typing) return

      triggerHyperspaceJump()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
