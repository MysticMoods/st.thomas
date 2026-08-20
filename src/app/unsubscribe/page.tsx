import type { Metadata } from 'next'

import { unsubscribe } from '@/lib/subscribers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Newsletter',
  robots: { index: false, follow: false },
}

/**
 * The other end of the link at the foot of every parish letter.
 *
 * It does the work on arrival rather than asking anybody to confirm: a person
 * who clicked "stop receiving these" has already said what they want, and
 * making them press a second button is a way of hoping they will not.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const email = token ? await unsubscribe(token) : null

  return (
    <main className="flex min-h-[80svh] items-center justify-center bg-[rgb(var(--page))] px-6 py-24">
      <div className="max-w-lg text-center">
        <p className="eyebrow">St. Thomas Church, Mangalassery</p>

        {email ? (
          <>
            <h1 className="heading-lg mt-5 text-[rgb(var(--ink))]">You have been taken off</h1>
            <span className="gold-rule mx-auto mt-6 block" aria-hidden="true" />
            <p className="body-text mt-6">
              No more parish newsletters will go to <strong>{email}</strong>. Nothing else changes —
              you are still part of the parish, and the website is where it always was.
            </p>
            <p className="mt-4 font-sans text-sm text-[rgb(var(--muted))]" lang="ml">
              ഈ വിലാസത്തിലേക്ക് ഇനി വാർത്താക്കുറിപ്പ് അയയ്ക്കില്ല.
            </p>
          </>
        ) : (
          <>
            <h1 className="heading-lg mt-5 text-[rgb(var(--ink))]">That link has expired</h1>
            <span className="gold-rule mx-auto mt-6 block" aria-hidden="true" />
            <p className="body-text mt-6">
              We could not find this address on the list — which may simply mean it has already been
              taken off. If letters keep arriving, telephone the parish office and somebody will do
              it by hand.
            </p>
          </>
        )}

        <a href="/" className="btn-primary mt-9">
          Back to the parish site
        </a>
      </div>
    </main>
  )
}
