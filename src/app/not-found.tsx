import Link from 'next/link'

import { ParishEmblem } from '@/components/ui/ParishEmblem'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-navy-950 px-6 text-center">
      <div className="flex flex-col items-center">
        <ParishEmblem variant="gold" className="h-24 w-24" />
        <p className="mt-10 font-display text-7xl text-gold-300">404</p>
        <h1 className="mt-5 font-display text-3xl text-white">This page is not in the register</h1>
        <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-stone-400">
          The page you were looking for has been moved or never existed. The doors of the church,
          however, remain open.
        </p>
        <Link href="/" className="btn-primary mt-10">
          Return home
        </Link>
      </div>
    </main>
  )
}
