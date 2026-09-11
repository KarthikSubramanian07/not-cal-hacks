import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowRight, Check, EyeOff } from 'lucide-react'
import { Lanyard } from '@/components/badge/lanyard'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { OpeningCrawl } from '@/components/space/opening-crawl'
import { DuneHorizon } from '@/components/space/dune-horizon'
import { OrbitCraft } from '@/components/space/orbit-craft'
import { Button } from '@/components/ui/button'
import { Magnetic, Spotlight } from '@/components/ui/interactive'
import { useInView, useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/** Fine print, running across the page like a status ticker. */
const DISCLAIMERS = [
  'Legally distinct',
  'No affiliation implied',
  'Any resemblance is coincidental',
  'Pizza quality not guaranteed',
  'Sleep sold separately',
  'Void where prohibited',
  'Not a real accreditation body',
  'No droids were harmed',
  'Spice not included',
  'Suns are decorative',
  'Do not eat the swag',
  'The wifi is fine, it is your code',
  'Merge conflicts are the mind-killer',
  'The cold brew must flow',
  'He who controls the aux cable controls the room',
  'Deploy without rhythm and you will not attract the on-call engineer',
  'Sandworms are a scheduling conflict, not a feature',
  'Walk without rhythm',
]

export function LandingPage() {
  return (
    <div className="relative z-10 min-h-dvh">
      <OpeningCrawl />
      <SiteNav />
      <main>
        <Hero />
        <Ticker />
        <HowItWorks />
        <BlindReview />
        <ForOrganizers />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  )
}

function Hero() {
  const reduced = useReducedMotion()

  const rise = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <section className="relative overflow-hidden">
      {/*
       * The horizon is a band at the foot of the section, not a wash behind it.
       * Text never sits on top of a sun, or beside one: the copy stops above
       * this band and the band is where the light comes from.
       */}
      <DuneHorizon className="top-auto bottom-0 h-[9rem] sm:h-[11rem]" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pt-2 pb-[11rem] text-center sm:px-8 sm:pb-[13rem]">
        {/* The badge floats: there is not much gravity out here. */}
        <Lanyard name="Your Name" role="Hacker" code="A3F9" className="w-[260px] sm:w-[300px]" />

        <motion.p className="telemetry mt-16 mb-5" {...rise(0.02)}>
          Applications open &middot; Window closes in 12 days
        </motion.p>

        <motion.h1 className="display-xl max-w-4xl" {...rise(0.06)}>
          Apply in five minutes.
          <br />
          <span className="text-fg-muted">Reviewed in thirty seconds.</span>
        </motion.h1>

        <motion.p
          className="measure text-fg-muted mt-6 text-[17px] leading-relaxed text-pretty"
          {...rise(0.14)}
        >
          A hackathon application portal that respects both sides of the table. Fill one form and
          watch it move. Organizers read it blind, score it against a rubric everyone shares, and
          get back to you before the suns come up.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          {...rise(0.22)}
        >
          <Magnetic>
            <Button asChild size="lg">
              <Link to="/apply/hacker">
                Apply as a hacker
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </Magnetic>
          <Button asChild size="lg" variant="outline">
            <Link to="/apply/mentor">Apply as a mentor</Link>
          </Button>
        </motion.div>

        <motion.p className="text-fg-dim mt-6 text-[13px]" {...rise(0.3)}>
          Drafts save while you type &middot;{' '}
          <Link to="/login" className="hover:text-fg-muted underline-offset-4 hover:underline">
            Organizer sign-in
          </Link>
        </motion.p>
      </div>
    </section>
  )
}

function Ticker() {
  const reduced = useReducedMotion()
  const items = [...DISCLAIMERS, ...DISCLAIMERS]

  return (
    <div className="border-line bg-ink/70 relative z-10 overflow-hidden border-y py-3 backdrop-blur-sm">
      <div className={cn('flex w-max gap-8', !reduced && 'animate-[ticker_46s_linear_infinite]')}>
        {items.map((text, index) => (
          <span
            key={index}
            className="text-fg-dim flex shrink-0 items-center gap-8 font-mono text-[11px] tracking-[0.12em] uppercase"
          >
            {text}
            <span className="text-sodium/50">&#9679;</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  )
}

const STEPS = [
  {
    label: 'Filed',
    title: 'Fill one form',
    body: 'Three short sections so nothing reads as a wall of text. Every keystroke saves as a draft, so losing your work is not a thing that can happen here.',
  },
  {
    label: 'In orbit',
    title: 'Hand it in',
    body: 'Submitting locks the form and starts the clock. Your status page shows exactly where it sits, on a timeline that is an audit trail rather than a guess.',
  },
  {
    label: 'Cleared',
    title: 'Hear back',
    body: 'A human reads it. If the answer is no, it says so plainly, without a paragraph of consolation nobody asked for.',
  },
]

function HowItWorks() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="display-lg">What happens after you hit submit</h2>
        <p className="measure text-fg-muted mx-auto mt-4 text-[15px] leading-relaxed">
          Three steps, all of them visible to you. No portal that forgets you exist for six weeks.
        </p>
      </div>

      <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <Spotlight className="panel h-full p-7 transition-transform duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1">
                <span className="text-sodium inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase">
                  <span className="bg-sodium size-1.5 rounded-full" />
                  {step.label}
                </span>
                <h3 className="mt-5 text-xl">{step.title}</h3>
                <p className="text-fg-muted mt-3 text-[14px] leading-relaxed text-pretty">
                  {step.body}
                </p>
              </Spotlight>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.16}>
          <OrbitCraft className="mx-auto hidden h-[26rem] w-[17rem] lg:block" />
        </Reveal>
      </div>
    </section>
  )
}

const QUEUE_ROWS = [
  { name: 'Amara Okonkwo', school: 'UC Berkeley', code: 'A3F9', score: '13' },
  { name: 'Dev Chatterjee', school: 'Waterloo', code: '7C21', score: '11' },
  { name: 'Sofia Nakamura', school: 'San Jose State', code: 'B840', score: '14' },
]

function BlindReview() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const reduced = useReducedMotion()

  return (
    <section className="border-line bg-ink/60 relative z-10 border-y backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32">
        <div>
          <h2 className="display-lg">Blind by default, not by checkbox</h2>
          <p className="measure text-fg-muted mt-6 text-[15px] leading-relaxed text-pretty">
            Names, emails and profile links are stripped on the server before an application reaches
            a reviewer. Not hidden with CSS, not filtered in a component. If an organizer has not
            asked to see who wrote it, the browser never receives it.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              'Redaction happens server-side, so it cannot leak through devtools',
              'Reviewers get a stable call sign like A3F9 to argue about instead',
              'One toggle reveals identity when a decision genuinely needs it',
            ].map((item) => (
              <li key={item} className="text-fg-muted flex items-start gap-3 text-[14px]">
                <Check className="text-status-accepted mt-1 size-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Holographic projection: this is a recording, not a person. */}
        <div
          ref={ref}
          className="panel relative overflow-hidden"
          style={{
            boxShadow:
              '0 0 0 1px oklch(0.82 0.13 203 / 0.18), 0 24px 70px -30px oklch(0.82 0.13 203 / 0.45)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, oklch(0.82 0.13 203 / 0.5) 0 1px, transparent 1px 4px)',
            }}
          />
          <div className="border-line relative flex items-center justify-between border-b px-5 py-3.5">
            <span className="text-ion font-mono text-[11px] tracking-[0.12em] uppercase">
              Review queue
            </span>
            <span className="border-line text-status-accepted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]">
              <EyeOff className="size-3" />
              BLIND ON
            </span>
          </div>

          {QUEUE_ROWS.map((row, index) => (
            <div
              key={row.name}
              className="border-line/60 relative flex items-center justify-between gap-4 border-b px-5 py-4 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="relative inline-block">
                  <span className="text-fg text-[15px]">{row.name}</span>
                  <motion.span
                    className="bg-fg-dim absolute -inset-x-1 inset-y-0 origin-left rounded-[3px]"
                    initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
                    animate={inView || reduced ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{
                      delay: 0.25 + index * 0.14,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </div>
                <p className="text-fg-dim mt-1 text-xs">{row.school}</p>
              </div>
              <span className="text-ion font-mono text-xs">#{row.code}</span>
              <span className="text-fg font-mono text-sm tabular-nums">{row.score}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    title: 'A queue that spreads coverage',
    body: 'Review next hands out the least-reviewed application, not the top of the list. Without it, the first twenty get five reads each and the tail gets none.',
  },
  {
    title: 'Calibration, not policing',
    body: 'A quiet strip shows your average next to the team average. Nobody is ranked or corrected. Most drift fixes itself the moment it becomes visible.',
  },
  {
    title: 'One review per person',
    body: 'Scoring the same application twice updates your review instead of stacking another one, so an average means what it appears to mean.',
  },
  {
    title: 'Keyboard all the way down',
    body: 'Number keys set the focused score, tab moves between them, and command-enter files the review and pulls the next application in.',
  },
]

function ForOrganizers() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="display-lg">Built for the person on their four hundredth application</h2>
        <p className="measure text-fg-muted mx-auto mt-4 text-[15px] leading-relaxed">
          Reviewing is the part that actually eats the weekend. It got the attention.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.06}>
            <div className="panel h-full p-7">
              <h3 className="text-xl">{feature.title}</h3>
              <p className="text-fg-muted mt-3 text-[14px] leading-relaxed text-pretty">
                {feature.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="border-line relative z-10 overflow-hidden border-t">
      <DuneHorizon className="top-auto bottom-0 h-[9rem] opacity-75" />
      <div className="relative mx-auto max-w-3xl px-5 pt-24 pb-[11rem] text-center sm:px-8 lg:pt-32">
        <h2 className="display-lg">The form takes five minutes</h2>
        <p className="measure text-fg-muted mx-auto mt-5 text-[15px] leading-relaxed text-pretty">
          Longer if you write something good in the last box, which you should.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Magnetic>
            <Button asChild size="lg">
              <Link to="/apply">
                Start an application
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Magnetic>
          <Button asChild size="lg" variant="outline">
            <a
              href="https://github.com/KarthikSubramanian07/not-cal-hacks"
              target="_blank"
              rel="noreferrer"
            >
              Steal the source
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Fades a block up the first time it scrolls into view, once, never again. */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const reduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      className="h-full"
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
