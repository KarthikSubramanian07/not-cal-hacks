import { ContentPage } from '@/routes/content-page'

export function PrivacyPage() {
  return (
    <ContentPage
      telemetry="Privacy"
      title="How we handle data"
      lead="This policy describes how the not-cal-hacks hackathon application portal collects and uses data when you create an account, file an application, or review applications as an organizer."
      sections={[
        {
          heading: 'What we collect',
          paragraphs: [
            'Account data includes email address, display name, password hash (or Google account identifiers when Sign in with Google is enabled), and role. Application data includes answers you submit for hacker or judge tracks, including school, project essays, links you choose to share, and status history. Review data includes rubric scores, optional comments, and decision events. Session cookies keep you signed in; tokens are hashed at rest. Operational logs exist for rate limits and outages, not advertising.',
          ],
        },
        {
          heading: 'How we use it',
          paragraphs: [
            'Account and application data exist so you can apply, track status, and so organizers can review and decide. Blind review strips identifying fields on the server before an application is sent to a reviewer unless that reviewer explicitly reveals identity. We do not sell personal data. We do not use application essays to train third-party models.',
          ],
        },
        {
          heading: 'Sharing, retention, and agents',
          paragraphs: [
            'Data is stored in Cloudflare D1 for the deployed project and shared with organizers of the event instance you applied to, plus infrastructure operators required to host the site. Public demo accounts contain synthetic seed data and should not be used for real personal information. You may request deletion through the contact page. Public documentation, OpenAPI, llms.txt, and discovery files contain no applicant personal data. Authenticated API routes require a session; agents must not scrape private application answers from authenticated surfaces into long-term memory.',
          ],
        },
      ]}
      footerLinks={[
        { to: '/about', label: 'About' },
        { to: '/contact', label: 'Contact' },
        { to: '/docs', label: 'API docs' },
      ]}
    />
  )
}
