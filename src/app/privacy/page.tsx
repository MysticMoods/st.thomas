import type { Metadata } from 'next'
import Link from 'next/link'

import { readContent } from '@/lib/content'
import type { SiteContent } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How St. Thomas Church, Mangalassery handles the information you share with the parish.',
}

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'Only what you type into a form on this site: your name, email address, an optional phone number and your message, or just your email address if you subscribe to the parish letter. The site sets two small preferences in your browser — your chosen language and light or dark theme. There is no analytics tracking, no advertising, and no third-party cookies.',
  },
  {
    title: 'Why we keep it',
    body: 'So the parish office can reply to you, and so the weekly letter reaches the right inbox. Nothing more.',
  },
  {
    title: 'Who sees it',
    body: 'The parish priest and the office staff. Your details are never sold, rented, shared with other organisations, or published on this website.',
  },
  {
    title: 'The parish register',
    body: 'Household records — baptisms, marriages, addresses, family members — are kept in the parish register for canonical and sacramental purposes. They are not published online. Only summary counts appear on this site.',
  },
  {
    title: 'How long we keep it',
    body: 'Contact form messages are kept for two years. Newsletter subscriptions are kept until you ask us to remove them, which you may do at any time by writing to the office.',
  },
  {
    title: 'Photographs',
    body: 'Parish events are sometimes photographed for the gallery. If you or your child appears in a photograph you would rather not see published, tell the office and it will be taken down.',
  },
  {
    title: 'Your rights',
    body: 'You may ask to see, correct or delete anything we hold about you. Write to the parish office and we will act on it within thirty days.',
  },
]

export default async function PrivacyPage() {
  const site = await readContent<SiteContent>('site')

  return (
    <main className="bg-[rgb(var(--page))]">
      <div className="container max-w-3xl py-24 sm:py-32">
        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center font-sans text-2xs uppercase tracking-[0.22em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
        >
          ← {site.parish.name.en}
        </Link>

        <h1 className="mt-8 heading-xl">Privacy Policy</h1>
        <span className="mt-6 block gold-rule" aria-hidden="true" />
        <p className="mt-8 lede">
          This parish asks for as little as possible, keeps it safely, and never passes it on.
        </p>

        <div className="mt-14 flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl text-[rgb(var(--ink))]">{section.title}</h2>
              <p className="mt-3 body-text">{section.body}</p>
            </section>
          ))}

          <section className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-8">
            <h2 className="font-display text-2xl text-[rgb(var(--ink))]">Contact</h2>
            <p className="mt-3 body-text">
              {site.contact.address.en}
              <br />
              <a
                href={`mailto:${site.contact.email}`}
                className="inline-flex min-h-[36px] items-center text-gold-600 dark:text-gold-400"
              >
                {site.contact.email}
              </a>{' '}
              · {site.contact.phone}
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
