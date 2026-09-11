/**
 * Generates `seed.generated.sql`.
 *
 * Two properties matter here. First, it is deterministic: the same seed always
 * produces the same 25 applicants, so a screenshot in the README still matches
 * the database a week later. Second, it hashes passwords with the *application's
 * own* hashing module rather than a copy, so the seed can never drift from what
 * the login route expects.
 */
import { writeFileSync } from 'node:fs'
import { hashPassword } from '../server/lib/password'
import type { ApplicationStatus, ApplicationType } from '../shared/constants'

// ---------------------------------------------------------------- randomness

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = rng(20260911)
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T
const pickMany = <T>(items: readonly T[], n: number): T[] => {
  const pool = [...items]
  const out: T[] = []
  for (let i = 0; i < n && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0] as T)
  }
  return out
}

// Stable, readable ids so the generated SQL diffs cleanly between runs.
let idCounter = 0
const nextId = (prefix: string) =>
  `${prefix}-${(++idCounter).toString(16).padStart(4, '0')}-seed0000-0000-000000000000`.slice(0, 36)

// ------------------------------------------------------------------- content

const FIRST_NAMES = [
  'Amara',
  'Dev',
  'Sofia',
  'Kenji',
  'Lucia',
  'Omar',
  'Freya',
  'Tobi',
  'Mira',
  'Elias',
  'Nina',
  'Rohan',
  'Priya',
  'Marcus',
  'June',
  'Theo',
  'Zainab',
  'Caleb',
  'Ines',
  'Hana',
  'Yusuf',
  'Clara',
  'Andre',
  'Leila',
  'Sam',
  'Wes',
  'Nadia',
  'Kofi',
]

const LAST_NAMES = [
  'Okonkwo',
  'Fernandes',
  'Nakamura',
  'Ruiz',
  'Haddad',
  'Lindqvist',
  'Adeyemi',
  'Chatterjee',
  'Moreau',
  'Vasquez',
  'Iyer',
  'Oyelaran',
  'Whitaker',
  'Papadopoulos',
  'Rahman',
  'Castellanos',
  'Bright',
  'Osei',
  'Strand',
  'Delgado',
  'Kaur',
  'Novak',
  'Mbeki',
  'Tran',
]

const SCHOOLS = [
  'UC Berkeley',
  'Stanford',
  'San Jose State',
  'UC Davis',
  'Cal Poly SLO',
  'De Anza College',
  'UCLA',
  'University of Waterloo',
  'Georgia Tech',
  'UIUC',
  'University of Michigan',
  'UT Austin',
  'Olin College',
  'Harvey Mudd',
  'City College of San Francisco',
  'UC Santa Cruz',
]

const MAJORS = [
  'EECS',
  'Computer Science',
  'Cognitive Science',
  'Data Science',
  'Mechanical Engineering',
  'Design Media Arts',
  'Applied Math',
  'Bioengineering',
  'Physics',
  'Undeclared',
]

const COMPANIES = [
  'Stripe',
  'Figma',
  'Vercel',
  'Notion',
  'Ramp',
  'Databricks',
  'Sentry',
  'Linear',
  'Retool',
  'Cloudflare',
  'Replit',
  'Supabase',
]

const ROLES = [
  'Staff Engineer',
  'Engineering Manager',
  'Senior Designer',
  'Infrastructure Lead',
  'ML Engineer',
  'Developer Advocate',
  'Founding Engineer',
  'Principal Engineer',
]

/** Essays of deliberately uneven quality, so the rubric has something to do. */
const WHY_ANSWERS = [
  'I have been to four hackathons and shipped nothing at three of them. I want the fourth pattern to break. I have a specific idea, a teammate who has already said yes, and a weekend with nothing else in it.',
  'Honestly, my roommate is going and I do not want to sit in the dorm. But I have been teaching myself Rust for two months and I would like an excuse to write something in it that other people will actually look at.',
  'I want to build things but every project I start alone dies in week two. A deadline I cannot move, in a room where everyone else is also building, is the only thing that has ever worked for me.',
  'My little brother is diabetic and the software he uses to track his glucose is genuinely hostile. I have wanted to rebuild it for a year. I would like thirty-six hours and someone to tell me when my UI is bad.',
  'To network and learn new technologies and grow as a developer.',
  'I am a designer who is tired of handing off mockups and never seeing them again. I want to sit next to engineers for a weekend and learn enough to stop being a bottleneck.',
  'Last year I helped run a hackathon and never got to build at one. I would like to be on the other side of the table for once, eating the bad pizza I used to order.',
  'I maintain a small open source library that about two hundred people use. I have never met another maintainer in person. I want to find out how other people handle the part where strangers are angry at your free software.',
  'I want to win.',
  'I am switching into software from a biology program and I need proof, to myself more than to anyone else, that I can finish something under pressure alongside people who have been doing this longer.',
  'There is a bus route in my town that is wrong on every maps app. I have the GTFS data. I have not had a reason to do anything with it. This would be the reason.',
  'I have an idea about splitting rent fairly when rooms are different sizes and everyone lies about their budget. It is a small problem and I think about it constantly.',
]

const PROJECT_ANSWERS = [
  'A terminal tool that watches my git branches and tells me which ones are safe to delete. It is four hundred lines and I use it every day, which still surprises me.',
  "I rewrote my high school's course registration page as a static site because the real one went down every semester. Roughly six hundred students used my version before the district asked me to take it down.",
  'A physical dashboard on my wall made of an e-ink screen and a Raspberry Pi that shows the next two trains. The code is bad. The object is real and I love it.',
  'A Chrome extension that strips autoplay video. Two thousand users. My first experience with people filing bug reports about something I made for myself.',
  "I built a website for my dad's landscaping business. It is a single HTML file. It doubled the number of calls he gets, which taught me more about software than any class has.",
  'A todo app, but I rewrote the sync layer three times until conflicts stopped losing data. Nobody uses it. The third sync layer is the best code I have written.',
  "A model that predicts whether a pull request will be reverted, trained on my team's history. It was right about sixty percent of the time, which is worse than it sounds.",
  'I made a game in Godot about being a night shift librarian. It has eleven minutes of content and one genuinely good joke.',
  "A CLI for my university's dining hall menus so I could stop opening a PDF. Scraping a PDF every morning taught me patience.",
  'I used React and Node to build a full stack application with authentication.',
  'A Discord bot that runs our intramural soccer league standings. It has survived two years and four rule changes, which mostly means I got good at migrations.',
  'I took apart a broken label printer and wrote a driver for it so it could print receipts of my commit history. It is useless and it works.',
]

const JUDGE_WHY = [
  'I have sat on a judging panel that argued for twenty minutes about a project none of us had actually run. I would like to do this properly, with a rubric, once.',
  'Most of my job is now meetings. I miss looking at something someone built in a weekend and telling them what is actually good about it.',
  'I review a lot of code written by people who learned from tutorials. Scoring a hackathon is the honest version of that: the work is in front of you, the clock has already run, and you have to say something useful.',
  'I run infrastructure for a living and I think students should meet someone who will tell them the truth about what production is like, from the other side of the table.',
]

// ------------------------------------------------------------------ SQL bits

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`
const sqlJson = (value: unknown) => sqlString(JSON.stringify(value))
const sqlNullableString = (value: string | null) => (value === null ? 'NULL' : sqlString(value))

const DAY = 24 * 60 * 60 * 1000
/** Fixed clock so generated timestamps are stable across runs. */
const NOW = Date.UTC(2026, 8, 11, 17, 0, 0)

interface SeededUser {
  id: string
  email: string
  fullName: string
  role: 'applicant' | 'organizer'
  password: string
}

interface SeededApplication {
  id: string
  userId: string
  type: ApplicationType
  status: ApplicationStatus
  answers: Record<string, unknown>
  createdAt: number
  submittedAt: number | null
}

interface SeededReview {
  applicationId: string
  reviewerId: string
  technical: number
  passion: number
  fit: number
  comment: string | null
  createdAt: number
}

// ------------------------------------------------------------------ builders

function commonAnswers(first: string, last: string, index: number) {
  return {
    firstName: first,
    lastName: last,
    pronouns: pick(['she/her', 'he/him', 'they/them', '']) || undefined,
    school: pick(SCHOOLS),
    gradYear: pick([2026, 2027, 2028, 2029]),
    linkedin:
      rand() > 0.45
        ? `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}`
        : undefined,
    github: rand() > 0.3 ? `https://github.com/${first.toLowerCase()}${index}` : undefined,
  }
}

function hackerAnswers(first: string, last: string, index: number) {
  return {
    ...commonAnswers(first, last, index),
    whyNotCalHacks: pick(WHY_ANSWERS),
    major: pick(MAJORS),
    experienceLevel: pick(['first', '1-2', '3+'] as const),
    tracks: pickMany(
      ['AI', 'Health', 'Fintech', 'Climate', 'Hardware', 'Open'] as const,
      1 + Math.floor(rand() * 3),
    ),
    proudestProject: pick(PROJECT_ANSWERS),
    dietary:
      rand() > 0.7 ? pick(['Vegetarian', 'Vegan', 'No pork', 'Celiac, strictly']) : undefined,
    tshirtSize: pick(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const),
  }
}

function judgeAnswers(first: string, last: string, index: number) {
  return {
    ...commonAnswers(first, last, index),
    whyNotCalHacks: pick(JUDGE_WHY),
    company: pick(COMPANIES),
    role: pick(ROLES),
    expertise: pickMany(
      ['Web', 'Mobile', 'ML', 'Hardware', 'Design', 'Cloud'] as const,
      1 + Math.floor(rand() * 3),
    ),
    yearsExperience: 3 + Math.floor(rand() * 14),
    availability: pickMany(
      ['Fri PM', 'Sat AM', 'Sat PM', 'Sun AM'] as const,
      1 + Math.floor(rand() * 3),
    ),
    judgedBefore: rand() > 0.4,
  }
}

const REVIEW_COMMENTS = [
  'Specific about what they want to build, which is rarer than it should be. Easy yes.',
  'Thin essays but the project list is real. Would take.',
  'Generic answers. Could be anyone. Leaning no, happy to be argued with.',
  'Strong builder, unclear why this event specifically. Still a yes.',
  'First hackathon and clearly nervous. Exactly who the beginner track is for.',
  'Great project, essay reads like it was written in the last four minutes.',
  'Judge fit is obvious. Availability covers the overnight gap we always miss.',
  null,
  'Loved the bus route answer. Someone who notices broken things.',
  'Borderline. Put them in front of a second reader.',
]

function build() {
  const users: SeededUser[] = []
  const applications: SeededApplication[] = []
  const reviews: SeededReview[] = []

  // --- organizers -----------------------------------------------------------
  const organizers: SeededUser[] = [
    {
      id: nextId('org1'),
      email: 'organizer@notcalhacks.dev',
      fullName: 'Priya Raghavan',
      role: 'organizer',
      password: 'demo1234',
    },
    {
      id: nextId('org2'),
      email: 'marcus@notcalhacks.dev',
      fullName: 'Marcus Oyelaran',
      role: 'organizer',
      password: 'demo1234',
    },
    {
      id: nextId('org3'),
      email: 'june@notcalhacks.dev',
      fullName: 'June Whitaker',
      role: 'organizer',
      password: 'demo1234',
    },
  ]
  users.push(...organizers)

  // --- the demo applicant ---------------------------------------------------
  // Carries one application of each type so the status page demonstrates both
  // a live review timeline and an untouched draft.
  const demo: SeededUser = {
    id: nextId('demo'),
    email: 'hacker@notcalhacks.dev',
    fullName: 'Alex Rivera',
    role: 'applicant',
    password: 'demo1234',
  }
  users.push(demo)

  const demoJudge: SeededUser = {
    id: nextId('demo'),
    email: 'judge@notcalhacks.dev',
    fullName: 'Sam Okonkwo',
    role: 'applicant',
    password: 'demo1234',
  }
  users.push(demoJudge)

  const demoHackerApp: SeededApplication = {
    id: nextId('appd'),
    userId: demo.id,
    type: 'hacker',
    status: 'under_review',
    answers: {
      ...hackerAnswers('Alex', 'Rivera', 1),
      school: 'UC Berkeley',
      major: 'EECS',
      experienceLevel: '1-2',
      tracks: ['AI', 'Climate'],
      whyNotCalHacks: WHY_ANSWERS[3] as string,
      proudestProject: PROJECT_ANSWERS[2] as string,
    },
    createdAt: NOW - 9 * DAY,
    submittedAt: NOW - 8 * DAY,
  }
  const demoHackerJudgeDraft: SeededApplication = {
    id: nextId('appd'),
    userId: demo.id,
    type: 'judge',
    status: 'draft',
    answers: { firstName: 'Alex', lastName: 'Rivera', school: 'UC Berkeley' },
    createdAt: NOW - 2 * DAY,
    submittedAt: null,
  }
  const demoJudgeApp: SeededApplication = {
    id: nextId('appd'),
    userId: demoJudge.id,
    type: 'judge',
    status: 'under_review',
    answers: {
      ...judgeAnswers('Sam', 'Okonkwo', 2),
      school: 'Georgia Tech',
      company: 'Cloudflare',
      role: 'Staff Engineer',
      expertise: ['Cloud', 'Web'],
      yearsExperience: 8,
      availability: ['Sat AM', 'Sat PM'],
      judgedBefore: true,
      whyNotCalHacks: JUDGE_WHY[0] as string,
    },
    createdAt: NOW - 7 * DAY,
    submittedAt: NOW - 6 * DAY,
  }
  applications.push(demoHackerApp, demoHackerJudgeDraft, demoJudgeApp)

  // --- the 25 seeded applicants --------------------------------------------
  // Distribution is fixed so the dashboard always has a realistic funnel:
  // work waiting in the queue, work in progress, and decisions already made.
  const plan: ApplicationStatus[] = [
    ...Array<ApplicationStatus>(3).fill('draft'),
    ...Array<ApplicationStatus>(12).fill('submitted'),
    ...Array<ApplicationStatus>(6).fill('under_review'),
    ...Array<ApplicationStatus>(2).fill('accepted'),
    'waitlisted',
    'rejected',
  ]

  plan.forEach((status, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length] as string
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length] as string
    const user: SeededUser = {
      id: nextId('user'),
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.edu`,
      fullName: `${first} ${last}`,
      role: 'applicant',
      password: 'demo1234',
    }
    users.push(user)

    // Roughly one in four applicants is a judge.
    const type: ApplicationType = i % 4 === 3 ? 'judge' : 'hacker'
    const createdAt = NOW - (20 - (i % 18)) * DAY
    applications.push({
      id: nextId('app0'),
      userId: user.id,
      type,
      status,
      answers: type === 'hacker' ? hackerAnswers(first, last, i) : judgeAnswers(first, last, i),
      createdAt,
      submittedAt: status === 'draft' ? null : createdAt + Math.floor(rand() * 2 * DAY),
    })
  })

  // --- reviews --------------------------------------------------------------
  // Every application past `submitted` must already carry a review, otherwise
  // the seeded state would describe something the app itself cannot produce.
  const needsReview = applications.filter(
    (a) =>
      a.status === 'under_review' ||
      a.status === 'accepted' ||
      a.status === 'waitlisted' ||
      a.status === 'rejected',
  )
  const optional = applications.filter((a) => a.status === 'submitted')

  const addReview = (app: SeededApplication, reviewer: SeededUser, bias: number) => {
    const score = () => Math.max(1, Math.min(5, Math.round(2.5 + bias + rand() * 1.8)))
    reviews.push({
      applicationId: app.id,
      reviewerId: reviewer.id,
      technical: score(),
      passion: score(),
      fit: score(),
      comment: pick(REVIEW_COMMENTS),
      createdAt: (app.submittedAt ?? app.createdAt) + DAY,
    })
  }

  // Each organizer scores slightly differently on purpose: the calibration
  // strip is pointless if everyone in the seed is identical.
  const bias = new Map([
    [organizers[0]!.id, 0.35],
    [organizers[1]!.id, -0.3],
    [organizers[2]!.id, 0.05],
  ])

  needsReview.forEach((app, i) => {
    const reviewer = organizers[i % organizers.length] as SeededUser
    addReview(app, reviewer, bias.get(reviewer.id) ?? 0)
    // Decided applications get a second opinion, as they would in practice.
    if (app.status !== 'under_review') {
      const second = organizers[(i + 1) % organizers.length] as SeededUser
      addReview(app, second, bias.get(second.id) ?? 0)
    }
  })

  // A handful of submitted applications are partly reviewed, leaving the rest
  // genuinely untouched so the review queue has real work in it.
  optional.slice(0, 4).forEach((app, i) => {
    const reviewer = organizers[(i + 1) % organizers.length] as SeededUser
    addReview(app, reviewer, bias.get(reviewer.id) ?? 0)
  })

  return { users, applications, reviews, organizers }
}

// ------------------------------------------------------------------- emitter

async function main() {
  const { users, applications, reviews, organizers } = build()

  // Hashed per user, not per distinct password: every row gets its own salt,
  // exactly as it would if the account had been created through signup.
  const hashes = new Map<string, string>()
  for (const user of users) hashes.set(user.id, await hashPassword(user.password))

  const lines: string[] = [
    '-- Generated by scripts/seed.ts. Do not edit by hand.',
    '-- Regenerate with: npm run db:seed',
    '',
    'PRAGMA defer_foreign_keys = true;',
    '',
    '-- Idempotent: wipe everything the seed owns before reinserting.',
    'DELETE FROM status_events;',
    'DELETE FROM reviews;',
    'DELETE FROM applications;',
    'DELETE FROM sessions;',
    'DELETE FROM rate_limits;',
    'DELETE FROM users;',
    '',
  ]

  lines.push('-- Users ------------------------------------------------------------')
  for (const user of users) {
    lines.push(
      `INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES (` +
        `${sqlString(user.id)}, ${sqlString(user.email)}, ${sqlString(hashes.get(user.id) as string)}, ` +
        `${sqlString(user.fullName)}, ${sqlString(user.role)}, ${NOW - 30 * DAY});`,
    )
  }

  lines.push('', '-- Applications -----------------------------------------------------')
  for (const app of applications) {
    lines.push(
      `INSERT INTO applications (id, user_id, type, status, answers, submitted_at, created_at, updated_at) VALUES (` +
        `${sqlString(app.id)}, ${sqlString(app.userId)}, ${sqlString(app.type)}, ${sqlString(app.status)}, ` +
        `${sqlJson(app.answers)}, ${app.submittedAt ?? 'NULL'}, ${app.createdAt}, ${app.submittedAt ?? app.createdAt});`,
    )
  }

  lines.push('', '-- Status events ----------------------------------------------------')
  // The timeline is rebuilt from the status machine rather than invented, so a
  // seeded application has the same history a real one would have.
  for (const app of applications) {
    const events: Array<[ApplicationStatus | null, ApplicationStatus, number]> = [
      [null, 'draft', app.createdAt],
    ]
    if (app.submittedAt !== null) {
      events.push(['draft', 'submitted', app.submittedAt])
      if (app.status !== 'submitted') {
        events.push(['submitted', 'under_review', app.submittedAt + DAY])
        if (app.status !== 'under_review') {
          events.push(['under_review', app.status, app.submittedAt + 2 * DAY])
        }
      }
    }
    for (const [from, to, at] of events) {
      const actor =
        from === null || to === 'submitted' ? sqlString(app.userId) : sqlString(organizers[0]!.id)
      lines.push(
        `INSERT INTO status_events (application_id, from_status, to_status, actor_id, created_at) VALUES (` +
          `${sqlString(app.id)}, ${sqlNullableString(from)}, ${sqlString(to)}, ${actor}, ${at});`,
      )
    }
  }

  lines.push('', '-- Reviews ----------------------------------------------------------')
  reviews.forEach((review, i) => {
    lines.push(
      `INSERT INTO reviews (id, application_id, reviewer_id, technical, passion, fit, comment, created_at, updated_at) VALUES (` +
        `${sqlString(`rev${String(i).padStart(4, '0')}-seed-0000-0000-000000000000`.slice(0, 36))}, ` +
        `${sqlString(review.applicationId)}, ${sqlString(review.reviewerId)}, ` +
        `${review.technical}, ${review.passion}, ${review.fit}, ${sqlNullableString(review.comment)}, ` +
        `${review.createdAt}, ${review.createdAt});`,
    )
  })

  lines.push('')
  writeFileSync('seed.generated.sql', lines.join('\n'))

  const counts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})

  console.log('wrote seed.generated.sql')
  console.log(`  users:        ${users.length} (${organizers.length} organizers)`)
  console.log(`  applications: ${applications.length}`, counts)
  console.log(`  reviews:      ${reviews.length}`)
}

await main()
