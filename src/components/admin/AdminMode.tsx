'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { type Role, mayEditSection } from '@/lib/permissions'
import type { ContentKey } from '@/lib/types'
import { cn } from '@/lib/utils'

type AdminModeValue = {
  /** True when a signed-in member of staff is looking at the page. */
  isAdmin: boolean
  /** True when they have switched editing on. */
  editing: boolean
  setEditing: (next: boolean) => void
  /**
   * Whether this person may edit one section. The server decides in earnest;
   * this is so a button they cannot use is never put in front of them.
   */
  canEdit: (section: ContentKey) => boolean
}

const STORAGE_KEY = 'stc-editing'

const AdminModeContext = createContext<AdminModeValue>({
  isAdmin: false,
  editing: false,
  setEditing: () => {},
  canEdit: () => false,
})

export function AdminModeProvider({
  isAdmin,
  role,
  sections,
  children,
}: {
  isAdmin: boolean
  /** The signed-in person's role, read on the server from the accounts file. */
  role?: Role
  /** The sections they may edit. Absent or empty means all of them. */
  sections?: ContentKey[]
  children: React.ReactNode
}) {
  const [editing, setEditingState] = useState(false)

  // Everything fixed to the top of the window has to drop by the height of the
  // admin strip, so it is marked on the body rather than threaded through props.
  const pathname = usePathname()
  useEffect(() => {
    const onPublicPage = isAdmin && !pathname?.startsWith('/admin')
    document.body.dataset.admin = onPublicPage ? 'true' : 'false'
  }, [isAdmin, pathname])

  // Editing survives a page change, so the vicar can walk down the site
  // correcting things without switching it back on each time.
  useEffect(() => {
    if (!isAdmin) return
    setEditingState(window.sessionStorage.getItem(STORAGE_KEY) === 'on')
  }, [isAdmin])

  const setEditing = useCallback((next: boolean) => {
    setEditingState(next)
    window.sessionStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
  }, [])

  const canEdit = useCallback(
    (section: ContentKey) => (role ? mayEditSection(role, sections, section) : false),
    [role, sections],
  )

  return (
    <AdminModeContext.Provider value={{ isAdmin, editing, setEditing, canEdit }}>
      {children}
    </AdminModeContext.Provider>
  )
}

export function useAdminMode() {
  return useContext(AdminModeContext)
}

/**
 * The strip that sits above everything else once staff are signed in. It is the
 * only thing that says "you are not looking at this as a visitor would".
 */
export function AdminBar() {
  const { isAdmin, editing, setEditing } = useAdminMode()
  const pathname = usePathname()

  // The dashboard has chrome of its own; the strip is for the public pages.
  if (!isAdmin || pathname?.startsWith('/admin')) return null

  return (
    <div
      className={cn(
        'no-print fixed inset-x-0 top-0 z-[75] w-full border-b transition-colors duration-300',
        editing
          ? 'border-gold-400/60 bg-gold-400 text-navy-950'
          : 'border-white/10 bg-navy-950 text-stone-200',
      )}
    >
      <div className="container flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
        <span className="flex items-center gap-2 font-sans text-2xs font-semibold uppercase tracking-[0.16em]">
          <Icon name={editing ? 'sparkle' : 'lock'} className="h-3.5 w-3.5" />
          {editing ? 'Editing the live site' : 'Signed in as parish staff'}
        </span>

        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className={cn(
            'rounded-sm border px-4 py-1.5 font-sans text-2xs font-semibold uppercase tracking-[0.14em] transition-colors',
            editing
              ? 'border-navy-950/40 bg-navy-950 text-gold-200 hover:bg-navy-900'
              : 'border-gold-400 bg-gold-400 text-navy-950 hover:bg-gold-300',
          )}
        >
          {editing ? 'Done editing' : 'Edit this page'}
        </button>

        {editing ? (
          <span className="font-sans text-2xs">
            Every section now carries an <strong>Edit</strong> button. Changes save straight to the
            site.
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-4 font-sans text-2xs uppercase tracking-[0.14em]">
          <a href="/admin" className="transition-opacity hover:opacity-70">
            Dashboard
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' })
              window.sessionStorage.removeItem(STORAGE_KEY)
              window.location.reload()
            }}
            className="transition-opacity hover:opacity-70"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
