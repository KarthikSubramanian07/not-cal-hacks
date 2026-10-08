import { ContentPage } from '@/routes/content-page'

export function PricingPage() {
  return (
    <ContentPage
      telemetry="Pricing"
      title="Free for applicants, organizers, and agents"
      lead="not-cal-hacks is free and open source. There is no paid API key tier and no credit card."
      sections={[
        {
          heading: 'What you get for $0',
          paragraphs: [
            'Applicants can create an account, file an application, and track status. Organizers get blind review, rubric scoring, a least-reviewed-first queue, and CSV export. Developers and agents get the public REST catalog, OpenAPI document, MCP server, and CLI with no purchase required.',
          ],
          list: ['Applicants: $0', 'Organizers: $0', 'Public API / MCP / CLI: $0', 'License: MIT'],
        },
        {
          heading: 'Hosting',
          paragraphs: [
            'The reference deployment on Cloudflare Pages is a public demo. Run your own instance if you need isolation or custom branding. Demo accounts on the live site are the sandbox environment.',
          ],
        },
      ]}
      footerLinks={[
        { to: '/developers', label: 'Developer portal' },
        { to: '/docs', label: 'API docs' },
        { to: '/about', label: 'About' },
      ]}
    />
  )
}
