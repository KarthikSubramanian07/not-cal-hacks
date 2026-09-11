import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/hooks'
import { triggerHyperspaceJump } from './starfield'

/**
 * The opening crawl.
 *
 * An unmistakable homage, built from the film-making moves rather than the
 * studio's assets: a quiet title card, a wordmark receding into the distance,
 * and gold text climbing away on a tilted plane. Every word is original and no
 * protected name, mark or ship appears anywhere in it.
 *
 * It plays on every load of `/`. Skip with the button, Escape, or a click on
 * the crawl. Wheel and stray keys used to cancel it on the first frame, which
 * made the intro look like it had been removed. Playwright sets `nch:crawl-skip`
 * so the suite does not sit through thirteen seconds. Anyone who asked their OS
 * to stop moving things never sees it.
 */

const SKIP_KEY = 'nch:crawl-skip'

function crawlShouldPlay(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return window.sessionStorage.getItem(SKIP_KEY) !== '1'
  } catch {
    return true
  }
}

const STANZAS = [
  'It is application season. Across the sector, thousands of builders have thirty-six hours, one folding table, and whatever hardware they can carry on the bus.',
  'A small crew of organizers must read every word before the launch window closes. They have been awake for some time.',
  'To stop themselves from reading the same twenty applications forever, they have built a portal. It is legally distinct from any other portal you may be thinking of....',
]

type Phase = 'intro' | 'title' | 'crawl' | 'done'

export function OpeningCrawl({ onFinished }: { onFinished?: () => void }) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('intro')
  const [visible, setVisible] = useState(crawlShouldPlay)
  const finishedRef = useRef(false)
  const canSkipRef = useRef(false)

  useEffect(() => {
    if (reducedMotion) {
      setVisible(false)
      return
    }
    if (crawlShouldPlay()) setVisible(true)
  }, [reducedMotion])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    setPhase('done')
    setVisible(false)
    // Arrive out of hyperspace rather than simply cutting to the page.
    triggerHyperspaceJump()
    onFinished?.()
  }, [onFinished])

  const skip = useCallback(() => {
    if (!canSkipRef.current) return
    finish()
  }, [finish])

  // Phase timing. Kept in one place so the sequence is readable as a sequence.
  useEffect(() => {
    if (!visible) return
    canSkipRef.current = false
    const timers = [
      window.setTimeout(() => {
        canSkipRef.current = true
      }, 700),
      window.setTimeout(() => setPhase('title'), 2200),
      window.setTimeout(() => setPhase('crawl'), 4100),
      window.setTimeout(finish, 17200),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [visible, finish])

  // Skip is deliberate: the button, Escape, or a click on the crawl itself.
  // Wheel, Space, and stray keys used to cancel it on the first frame, which
  // made the intro look like it had been removed.
  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, skip])

  if (!visible || phase === 'done') return null

  return (
    <div
      className="fixed inset-0 z-[70] cursor-pointer overflow-hidden bg-black"
      onClick={skip}
      role="presentation"
    >
      {phase === 'intro' ? (
        <p className="absolute top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 [animation:crawl-fade_2.2s_ease-out_forwards] px-6 text-center text-[clamp(1rem,2.6vw,1.6rem)] leading-relaxed text-[#5ec8ff] opacity-0">
          Not long ago, in a lecture hall not remotely far away&hellip;.
        </p>
      ) : null}

      {phase === 'title' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p
            className="[animation:crawl-title_2.4s_cubic-bezier(0.16,1,0.3,1)_forwards] text-[clamp(2rem,9vw,7rem)] leading-none font-bold tracking-[-0.03em] text-[#ffd24a]"
            style={{ fontStretch: '118%' }}
          >
            NOT CAL HACKS
          </p>
        </div>
      ) : null}

      {phase === 'crawl' ? (
        <div
          className="absolute inset-0"
          style={{ perspective: '680px', perspectiveOrigin: '50% 92%' }}
        >
          <div
            className="absolute left-1/2 w-[min(92vw,840px)] -translate-x-1/2 [animation:crawl-scroll_13s_linear_forwards] text-justify text-[#ffd24a]"
            style={{
              transformOrigin: '50% 100%',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 34%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 34%)',
            }}
          >
            <p
              className="mb-8 text-center text-[clamp(1.6rem,4.2vw,3rem)] leading-tight font-bold"
              style={{ fontStretch: '115%' }}
            >
              EPISODE I
              <br />
              THE APPLICATION
            </p>
            {STANZAS.map((text) => (
              <p
                key={text.slice(0, 24)}
                className="mb-7 text-[clamp(1.25rem,3.1vw,2.05rem)] leading-[1.45] font-semibold"
              >
                {text}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          skip()
        }}
        className="absolute right-5 bottom-5 rounded-full border border-white/25 bg-black/50 px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-white/70 uppercase transition-colors hover:border-white/50 hover:text-white"
      >
        Skip intro · Esc
      </button>

      <style>{`
        @keyframes crawl-fade {
          0% { opacity: 0 }
          18% { opacity: 1 }
          82% { opacity: 1 }
          100% { opacity: 0 }
        }
        @keyframes crawl-title {
          0% { transform: scale(2.6); opacity: 0 }
          14% { opacity: 1 }
          100% { transform: scale(0.32); opacity: 0 }
        }
        @keyframes crawl-scroll {
          0% { transform: rotateX(34deg) translateY(100%) }
          100% { transform: rotateX(34deg) translateY(-190%) }
        }
      `}</style>
    </div>
  )
}
