import { ContentPage } from '@/routes/content-page'

export function AboutPage() {
  return (
    <ContentPage
      telemetry="About"
      title="A portal for both sides of the table"
      lead="not-cal-hacks is a hackathon application portal built for the applicant filling a form at 1 a.m. and the organizer reading the four-hundredth essay with coffee that stopped helping two hours ago."
      sections={[
        {
          heading: 'What it does',
          paragraphs: [
            'Applicants create an account, pick a track (hacker or judge), fill a short form that autosaves, submit, and watch an append-only status timeline. Organizers sign in to a console where applications arrive with names, emails, and profile links stripped on the server before serialization.',
            'Reviewers score technical ability, passion, and fit on a shared 1–5 rubric, pull the least-reviewed application next, and decide accept, waitlist, or reject without a spreadsheet.',
          ],
        },
        {
          heading: 'Why it exists',
          paragraphs: [
            'Most portals forget applicants for six weeks and burn organizers on review logistics. not-cal-hacks keeps both sides visible: status is an audit trail, blind review is the default, and calibration quietly shows a reviewer average next to the team so scoring drift corrects itself.',
          ],
        },
        {
          heading: 'What it is not',
          paragraphs: [
            'The name is a joke and a disclaimer. This project is legally distinct from any similarly named hackathon. There is no affiliation, endorsement, or accreditation. Source is MIT-licensed and the live demo accounts exist so anyone can inspect the product without a private invite.',
          ],
        },
      ]}
      footerLinks={[
        { to: '/contact', label: 'Contact' },
        { to: '/privacy', label: 'Privacy' },
        { to: '/developers', label: 'Developers' },
        { to: '/docs', label: 'API docs' },
      ]}
    />
  )
}
