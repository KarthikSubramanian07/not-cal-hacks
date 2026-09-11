import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks the OS "reduce motion" preference and keeps tracking it, so toggling
 * the setting takes effect without a reload.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** Debounce that always calls the latest callback, never a stale closure. */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): (...args: A) => void {
  const latest = useRef(callback)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    latest.current = callback
  }, [callback])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => latest.current(...args), delay)
    },
    [delay],
  )
}

/** localStorage-backed state that degrades to in-memory when storage is blocked. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initial : (JSON.parse(stored) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private browsing, or storage full. Not worth interrupting anyone over.
    }
  }, [key, value])

  return [value, setValue] as const
}

/** Fires once when an element first scrolls into view. */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin: '-10% 0px', ...options })
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, options])

  return [ref, inView] as const
}

/** Registers a global keyboard shortcut, skipping keystrokes aimed at inputs. */
export function useHotkey(
  combo: { key: string; meta?: boolean; shift?: boolean },
  handler: () => void,
  enabled = true,
) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true

      const wantsModifier = combo.meta === true
      const hasModifier = event.metaKey || event.ctrlKey
      if (wantsModifier !== hasModifier) return
      if ((combo.shift ?? false) !== event.shiftKey) return
      if (event.key.toLowerCase() !== combo.key.toLowerCase()) return
      // Plain keys are ignored while typing; chorded ones still fire, which is
      // what makes Cmd+Enter work from inside the comment box.
      if (typing && !wantsModifier) return

      event.preventDefault()
      latest.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [combo.key, combo.meta, combo.shift, enabled])
}
