import { expect, test, type Page } from '@playwright/test'

/**
 * The whole product in one pass.
 *
 * A stranger signs up, fills in an application, submits it and watches their
 * status. An organizer then reviews it blind, scores it, decides, and the
 * applicant sees the decision. If this passes, the thing works.
 */

const unique = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 100000)}`

/** The opening crawl plays once per session; tests do not need to watch it. */
async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('nch:crawl-skip', '1')
  })
}

async function signUp(page: Page, email: string) {
  await page.goto('/signup')
  await page.getByLabel('Full name').fill('E2E Applicant')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('hunter2hunter2')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/apply/)
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page)
})

test('the landing page says what this is', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Apply in five minutes')
  await expect(page.getByRole('link', { name: 'Apply' }).first()).toBeVisible()
})

test('the apply page shows three doors before anyone signs in', async ({ page }) => {
  await page.goto('/apply')
  await expect(page.getByRole('heading', { name: 'How are you walking in?' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in as a hacker' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in as a judge' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Organizer sign-in' })).toBeVisible()
})

test('an applicant applies and an organizer decides', async ({ page }) => {
  const email = `${unique()}@example.edu`

  // --- applicant -----------------------------------------------------------
  await signUp(page, email)
  await page.goto('/apply/hacker')

  await page.getByLabel('First name').fill('Ada')
  await page.getByLabel('Last name').fill('Lovelace')
  await page.getByLabel('School').fill('UC Berkeley')
  await page.getByLabel('Graduation year').fill('2028')
  await page.getByRole('button', { name: 'Next' }).click()

  await page.getByLabel('Major').fill('EECS')
  await page.getByRole('radio', { name: 'This is my first' }).click()
  await page.getByRole('checkbox', { name: 'AI' }).click()
  await page.getByRole('radio', { name: 'M', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  await page
    .getByLabel('Why not Cal Hacks?')
    .fill(
      'I want to finally finish something I started, in a room where nobody lets me quietly give up on it halfway through the second night.',
    )
  await page
    .getByLabel('The thing you are proudest of building')
    .fill(
      'A tiny command line tool that renames my screenshots so I can actually find them later. Four hundred lines, and I use it every single day.',
    )
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible()
  await page.getByRole('button', { name: 'Submit application' }).click()

  await expect(page).toHaveURL(/\/status/)
  await expect(page.getByText('Submitted').first()).toBeVisible()

  // --- organizer -----------------------------------------------------------
  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, 'organizer@notcalhacks.dev', 'demo1234')
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/review')
  // Blind is the default and the server is the thing withholding the name.
  await expect(page.getByRole('button', { name: /blind on/i })).toBeVisible()
  await expect(page.getByText('Blind mode is on')).toBeVisible()

  await page.getByRole('button', { name: 'Technical: 4' }).click()
  await page.getByRole('button', { name: 'Passion: 4' }).click()
  await page.getByRole('button', { name: 'Fit: 5' }).click()
  await page.getByRole('button', { name: /file review and continue/i }).click()
  await expect(page.getByText(/left in your queue/i)).toBeVisible()

  // --- decide --------------------------------------------------------------
  await page.goto('/admin')
  await page.getByPlaceholder('Search name, email or school').fill(email)
  const row = page.locator('tr', { hasText: email })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Accept' }).click()
  await expect(row.getByText('Accepted')).toBeVisible()

  // --- the applicant sees it ----------------------------------------------
  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, email, 'hunter2hunter2')
  await page.goto('/status')
  await expect(page.getByText('You are in')).toBeVisible()
})

test('an applicant cannot reach the organizer console', async ({ page }) => {
  await signUp(page, `${unique()}@example.edu`)

  await page.goto('/admin')
  // The client redirects, and the API would refuse it regardless.
  await expect(page).toHaveURL(/\/status/)

  const response = await page.request.get('/api/admin/stats')
  expect(response.status()).toBe(403)
})

test('a signed-out visitor is sent to sign in', async ({ page }) => {
  await page.goto('/status')
  await expect(page).toHaveURL(/\/login/)
})

test('the organizer door lands in the console', async ({ page }) => {
  await page.goto('/apply')
  await page.getByRole('link', { name: 'Organizer sign-in' }).click()
  await expect(page).toHaveURL(/\/login\?as=organizer/)
  await page.getByLabel('Email').fill('organizer@notcalhacks.dev')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin/)
})
