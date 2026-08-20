import { promises as fs } from 'fs'
import path from 'path'

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Photo Credits',
  description: 'Licensing for the photographs used on this demonstration site.',
}

type Credit = { file: string; source: string; license: string; origin: string }

async function credits(): Promise<Credit[]> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'public', 'images', 'credits.json'),
      'utf-8',
    )
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export default async function CreditsPage() {
  const list = await credits()

  return (
    <main className="bg-[rgb(var(--page))]">
      <div className="container max-w-4xl py-24 sm:py-32">
        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center font-sans text-2xs uppercase tracking-[0.22em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
        >
          ← St. Thomas Church
        </Link>

        <h1 className="mt-8 heading-xl">Photo Credits</h1>
        <span className="mt-6 block gold-rule" aria-hidden="true" />

        <p className="mt-8 lede">
          Every photograph on this demonstration site is public-domain stock photography, free for
          commercial use with no attribution required. They stand in for real parish photography.
        </p>

        <p className="mt-6 body-text">
          Nothing here is taken from the Vatican or any other church&rsquo;s website, and no
          copyrighted artwork, logo or official photograph is used. The parish emblem is drawn in
          code specifically for this site.
        </p>

        <div className="mt-14 overflow-x-auto rounded-sm border border-[rgb(var(--line))]">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[rgb(var(--line))] bg-[rgb(var(--page-alt))]">
                <th className="px-5 py-3.5 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  File
                </th>
                <th className="px-5 py-3.5 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Source
                </th>
                <th className="px-5 py-3.5 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Licence
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((credit) => (
                <tr key={credit.file} className="border-b border-[rgb(var(--line))] last:border-0">
                  <td className="px-5 py-3 font-sans text-xs text-[rgb(var(--ink))]">
                    {credit.file.replace('/images/site/', '')}
                  </td>
                  <td className="px-5 py-3 font-sans text-xs">
                    <a
                      href={credit.origin}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-[36px] items-center text-gold-600 hover:underline dark:text-gold-400"
                    >
                      {credit.source}
                    </a>
                  </td>
                  <td className="px-5 py-3 font-sans text-xs text-[rgb(var(--muted))]">
                    {credit.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
