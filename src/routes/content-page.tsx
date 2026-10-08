import { Link } from 'react-router'
import { SiteFooter, SiteNav } from '@/components/site-chrome'

export interface ContentSection {
  heading: string
  paragraphs: string[]
  list?: string[]
}

export function ContentPage({
  telemetry,
  title,
  lead,
  sections,
  footerLinks,
}: {
  telemetry: string
  title: string
  lead: string
  sections: ContentSection[]
  footerLinks?: Array<{ to: string; label: string }>
}) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:px-8">
        <p className="telemetry">{telemetry}</p>
        <h1 className="display-lg mt-3">{title}</h1>
        <p className="measure text-fg-muted mt-4 text-[15px] leading-relaxed">{lead}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="display-sm">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-fg-muted mt-3 text-[15px] leading-relaxed">
                  {p}
                </p>
              ))}
              {section.list ? (
                <ul className="text-fg-muted mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {footerLinks && footerLinks.length > 0 ? (
          <div className="border-line mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t pt-8 text-[13px]">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
