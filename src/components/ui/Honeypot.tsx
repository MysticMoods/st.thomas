'use client'

import { useId } from 'react'

/**
 * The field a person never sees and a form-filling robot always fills.
 *
 * Chosen over a captcha deliberately. A captcha makes every parishioner prove
 * they are human — badly, if they use a screen reader or have poor eyesight —
 * and sends their behaviour to a third party to do it. This costs a visitor
 * nothing: it is hidden from the eye, hidden from assistive technology, and
 * skipped by the tab key, so only something reading the markup will fill it.
 *
 * The server answers a filled one with a cheerful success, so whoever sent it
 * learns nothing and has no reason to try again differently.
 */
export function Honeypot({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  // Two forms can share a page — the contact form and another —
  // so the id has to be unique even though the name never changes.
  const id = useId()

  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={id}>Leave this field empty</label>
      <input
        id={id}
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
