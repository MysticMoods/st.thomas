'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import {
  MACHINE_KEYS,
  countFields,
  hasMatch,
  isBilingual,
  label,
  selfMatch,
} from '@/lib/editor-search'
import { cn } from '@/lib/utils'

import { useAutoTranslate } from './AutoTranslate'

type Json = unknown

/**
 * The whole section being edited. A single field sometimes needs to see the
 * rest of the document — a notice's category, for instance, is only meaningful
 * against the list of categories declared at the top of the same file.
 */
const DocumentContext = createContext<unknown>(null)

const IMAGE_KEYS = new Set(['image', 'src', 'ogImage', 'file', 'images', 'photo'])
/** Plain calendar dates. Anything with a time is kept intact around the date. */
const DATE_KEYS = new Set(['date', 'endDate', 'born', 'died', 'published', 'start', 'end', 'from', 'to'])
/** Machine references. Real, but nothing the parish should have to think about. */
const QUIET_KEYS = new Set(['id'])
const LONG_KEYS = new Set([
  'body', 'message', 'description', 'bio', 'welcome', 'lede', 'note', 'excerpt', 'quote',
  'history', 'tribute', 'survivedBy', 'joinNote', 'subtitle', 'receiptNote',
])

/**
 * What is being looked for, shared with every field below.
 *
 * The largest section on this site — the ministries, with the family units
 * inside it — is a thousand fields deep in seven levels. Correcting one group
 * leader's telephone number meant opening all of it and hunting. Typing their
 * name now puts that one field on the screen and nothing else.
 */
const SearchContext = createContext('')





/** Short human summary shown on a collapsed array item. */
function preview(value: unknown): string {
  if (isBilingual(value)) return value.en
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `${value.length} items`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['title', 'name', 'label', 'question', 'id', 'time', 'years', 'role', 'died']) {
      if (key in record) return preview(record[key])
    }
  }
  return ''
}

export function JsonEditor(props: {
  value: Json
  onChange: (next: Json) => void
  path?: string[]
  depth?: number
}) {
  // The outermost editor owns the document; the rest read it from context.
  if (!props.path || props.path.length === 0) {
    return (
      <DocumentContext.Provider value={props.value}>
        <SearchableDocument {...props} />
      </DocumentContext.Provider>
    )
  }
  return <Field {...props} />
}


function SearchableDocument(props: {
  value: Json
  onChange: (next: Json) => void
  path?: string[]
  depth?: number
}) {
  const [query, setQuery] = useState('')
  const total = useMemo(() => countFields(props.value), [props.value])
  const found = query.trim() ? hasMatch(props.value, '', query.trim()) : true

  return (
    <SearchContext.Provider value={query.trim()}>
      {/* Worth the space once a section runs past a screenful; below that the
          whole thing is already in front of the person and a search box is one
          more thing to read past. */}
      {total > 25 ? (
        <div className="sticky top-0 z-10 -mx-1 mb-5 bg-[rgb(var(--card))] px-1 pb-3 pt-1">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Find among ${total} fields — a name, a number, a word`}
              className="field !pl-10 !pr-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear the search"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-sm text-[rgb(var(--muted))] transition-colors hover:text-gold-500"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {query.trim() ? (
            <p className="mt-2 font-sans text-2xs text-[rgb(var(--muted))]">
              {found
                ? 'Showing only what matches. Clear the box to see the whole section again.'
                : 'Nothing here says that.'}
            </p>
          ) : null}
        </div>
      ) : null}

      <Field {...props} />
    </SearchContext.Provider>
  )
}

function Field({
  value,
  onChange,
  path = [],
  depth = 0,
}: {
  value: Json
  onChange: (next: Json) => void
  path?: string[]
  depth?: number
}) {
  const key = path[path.length - 1] ?? ''

  if (isBilingual(value)) {
    return <BilingualField value={value} onChange={onChange} name={key} />
  }

  if (Array.isArray(value)) {
    return <ArrayField value={value} onChange={onChange} path={path} depth={depth} />
  }

  if (value && typeof value === 'object') {
    return <ObjectField value={value as Record<string, unknown>} onChange={onChange} path={path} depth={depth} />
  }

  if (typeof value === 'boolean') {
    return (
      <label className="inline-flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-gold-500"
        />
        <span className="font-sans text-sm text-[rgb(var(--muted))]">{value ? 'Yes' : 'No'}</span>
      </label>
    )
  }

  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="field max-w-[12rem] tabular-nums"
      />
    )
  }

  const text = String(value ?? '')

  if (IMAGE_KEYS.has(key) || text.startsWith('/images/') || text.startsWith('/uploads/')) {
    return <ImageField value={text} onChange={onChange} />
  }

  // An empty one too: a notice added a minute ago has no date yet, and that is
  // exactly when somebody needs the calendar.
  if (DATE_KEYS.has(key) && (text === '' || /^\d{4}-\d{2}-\d{2}/.test(text))) {
    return <DateField value={text} onChange={onChange} />
  }

  // "6:30 AM" in the Mass timetable and the parish week. Free wording such as
  // "After the evening Mass" is left as text.
  if (key === 'time' && (text === '' || CLOCK.test(text))) {
    return <TimeField value={text} onChange={onChange} />
  }

  if (key === 'category' || key === 'fund') {
    return <ChoiceField value={text} onChange={onChange} groupKey={key} />
  }

  if (QUIET_KEYS.has(key)) {
    return (
      <input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className="field max-w-[16rem] font-mono text-xs text-[rgb(var(--muted))]"
      />
    )
  }

  if (LONG_KEYS.has(key) || text.length > 110) {
    return (
      <textarea
        value={text}
        rows={Math.min(10, Math.max(3, Math.ceil(text.length / 80)))}
        onChange={(e) => onChange(e.target.value)}
        className="field resize-y"
      />
    )
  }

  return <input value={text} onChange={(e) => onChange(e.target.value)} className="field" />
}

/**
 * One object's fields.
 *
 * Two things happen here that did not before. A search narrows it to the
 * branches that answer, so a thousand-field section can be reduced to the one
 * row somebody came for. And the fields that exist for the site rather than for
 * the parish — ids, the flags that decide how a list is drawn — are folded
 * behind a line, where they can still be reached but are not in the way.
 */
function ObjectField({
  value,
  onChange,
  path,
  depth,
}: {
  value: Record<string, unknown>
  onChange: (next: Json) => void
  path: string[]
  depth: number
}) {
  const query = useContext(SearchContext)
  const [showMachine, setShowMachine] = useState(false)

  const all = Object.entries(value)
  const plain = all.filter(([key]) => !MACHINE_KEYS.has(key))
  const machine = all.filter(([key]) => MACHINE_KEYS.has(key))

  const visible = query ? plain.filter(([key, child]) => hasMatch(child, key, query)) : plain
  // A search reaches the technical fields too, rather than pretending they are
  // not there — somebody looking for an id should find it.
  const machineHit = query ? machine.filter(([key, child]) => hasMatch(child, key, query)) : machine

  const field = ([childKey, childValue]: [string, unknown]) => {
    const editor = (
      <JsonEditor
        value={childValue}
        onChange={(next) => onChange({ ...value, [childKey]: next })}
        path={[...path, childKey]}
        depth={depth + 1}
      />
    )
    return (
      <Row key={childKey} name={childKey} value={childValue}>
        {selfMatch(childValue, childKey, query) ? (
          // This is the thing that was asked for. Stop narrowing and show it.
          <SearchContext.Provider value="">{editor}</SearchContext.Provider>
        ) : (
          editor
        )}
      </Row>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        depth > 0 && 'border-l border-stone-300/60 pl-5 dark:border-navy-700',
      )}
    >
      {visible.map(field)}

      {machine.length === 0 ? null : query ? (
        machineHit.map(field)
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setShowMachine((was) => !was)}
            className="inline-flex items-center gap-1.5 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:text-gold-500"
          >
            <Icon
              name="chevronDown"
              className={cn('h-3 w-3 transition-transform duration-300', showMachine && 'rotate-180')}
            />
            {showMachine ? 'Hide' : 'Show'} technical {machine.length === 1 ? 'field' : 'fields'}
          </button>
          {showMachine ? (
            <div className="mt-4 flex flex-col gap-5">{machine.map(field)}</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** "6:30 AM", the way the site writes a time of day. */
const CLOCK = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i

/** "6:30 PM" → "18:30", for a time input. */
function toClock24(text: string) {
  const m = CLOCK.exec(text.trim())
  if (!m) return ''
  let hour = Number(m[1]) % 12
  if (m[3].toUpperCase() === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${m[2]}`
}

/** "18:30" → "6:30 PM", as the site prints it. */
function toClock12(value: string) {
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** Opens the browser's own calendar or clock on a click anywhere in the box. */
function openPicker(event: React.MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    /* older browsers: the box still takes typing */
  }
}

/**
 * A calendar for the date, opened by a click anywhere in the box, with the date
 * written out beside it so a slip of the finger is seen before it is saved.
 * Stored as ISO ("2026-08-10"). A stored time ("2026-08-10T15:30:00+05:30" — the
 * funeral) is carried along untouched: the time the site prints is the worded
 * field beside it, which has a Malayalam form a clock cannot give.
 */
function DateField({ value, onChange }: { value: string; onChange: (next: Json) => void }) {
  const [date, ...rest] = value.split('T')
  const tail = rest.length ? `T${rest.join('T')}` : ''

  const spelled = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        value={date}
        onClick={openPicker}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}${tail}` : '')}
        className="field max-w-[12rem] cursor-pointer tabular-nums"
        aria-label="Date"
      />
      {spelled ? (
        <span className="font-sans text-2xs text-[rgb(var(--muted))]">{spelled}</span>
      ) : (
        <span className="font-sans text-2xs text-[rgb(var(--muted))]">Click to choose a date</span>
      )}
      {date ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] underline-offset-4 hover:text-burgundy-500 hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}

/** A clock for a time of day, kept in the words the site prints: "6:30 AM". */
function TimeField({ value, onChange }: { value: string; onChange: (next: Json) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="time"
        value={toClock24(value)}
        onClick={openPicker}
        onChange={(e) => onChange(e.target.value ? toClock12(e.target.value) : '')}
        className="field max-w-[9rem] cursor-pointer tabular-nums"
        aria-label="Time"
      />
      <span className="font-sans text-2xs text-[rgb(var(--muted))]">
        {value ? `Shown as ${value}` : 'Click to choose a time'}
      </span>
    </div>
  )
}

/**
 * Categories and funds are declared once at the top of the file and referred to
 * by id further down. Typing that id by hand is how a notice ends up filed
 * under nothing, so offer the declared list instead.
 */
function ChoiceField({
  value,
  onChange,
  groupKey,
}: {
  value: string
  onChange: (next: Json) => void
  groupKey: string
}) {
  const doc = useContext(DocumentContext)

  const options = useMemo(() => {
    const listKey = groupKey === 'fund' ? 'funds' : 'categories'
    const list = (doc as Record<string, unknown> | null)?.[listKey]
    if (!Array.isArray(list)) return []
    return list
      .map((entry) => {
        const record = entry as Record<string, unknown>
        const id = typeof record?.id === 'string' ? record.id : ''
        const label = record?.label ?? record?.name ?? record?.title
        const text = isBilingual(label) ? label.en : typeof label === 'string' ? label : id
        return { id, text }
      })
      .filter((option) => option.id)
  }, [doc, groupKey])

  if (options.length === 0) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} className="field" />
  }

  const known = options.some((option) => option.id === value)

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={known ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="field max-w-[22rem]"
      >
        {known ? null : <option value="">Choose one…</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.text}
          </option>
        ))}
      </select>
      {known ? null : (
        <span className="font-sans text-2xs text-burgundy-500 dark:text-burgundy-300">
          {value ? `"${value}" is not one of the categories above.` : 'Nothing chosen yet.'}
        </span>
      )}
    </div>
  )
}

function Row({
  name,
  value,
  children,
}: {
  name: string
  value: unknown
  children: React.ReactNode
}) {
  const complex = !!value && typeof value === 'object' && !isBilingual(value)
  return (
    <div className="flex flex-col gap-2">
      <span
        className={cn(
          'font-sans text-2xs uppercase tracking-[0.16em]',
          complex ? 'text-gold-600 dark:text-gold-400' : 'text-[rgb(var(--muted))]',
        )}
      >
        {label(name)}
      </span>
      {children}
    </div>
  )
}

function BilingualField({
  value,
  onChange,
  name,
}: {
  value: { en: string; ml: string }
  onChange: (next: Json) => void
  name: string
}) {
  const { lang, enabled, translate } = useAutoTranslate()
  const long = LONG_KEYS.has(name) || value.en.length > 110 || value.ml.length > 110
  const Box = long ? 'textarea' : 'input'
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')

  // The English as it was last translated, so tabbing through an untouched
  // field does not ask for the same translation again.
  const done = useRef(value.en.trim())
  // Whether the English was typed in since this field was opened.
  const touched = useRef(false)

  /** English into Malayalam. The English is the parish's own wording. */
  const toMalayalam = useCallback(async () => {
    const source = value.en.trim()
    if (!source) return
    setBusy(true)
    setFailed('')
    try {
      const text = await translate(source, 'en', 'ml')
      done.current = source
      if (text) onChange({ ...value, ml: text })
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'Translation failed')
    } finally {
      setBusy(false)
    }
  }, [value, onChange, translate])

  /**
   * Leaving an English box keeps the Malayalam in step, out of sight: an empty
   * one is filled, and one is rewritten only when the English was just changed.
   * Nothing written in Malayalam ever rewrites the English — it cannot be seen
   * from there to be checked.
   */
  const sync = useCallback(() => {
    if (!enabled || lang !== 'en') return
    const source = value.en.trim()
    if (!source || source === done.current) return
    if (!value.ml.trim() || touched.current) toMalayalam()
  }, [enabled, lang, value, toMalayalam])

  const missing = lang === 'ml' && !value.ml.trim()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Box
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ rows: long ? 5 : undefined } as any)}
          value={value[lang]}
          lang={lang}
          placeholder={lang === 'ml' ? 'ഇതുവരെ മലയാളത്തിൽ ഇല്ല — not written in Malayalam yet' : ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (lang === 'en') touched.current = true
            onChange({ ...value, [lang]: e.target.value })
          }}
          onBlur={sync}
          className={cn(
            'field',
            long && 'resize-y',
            lang === 'ml' && 'font-malayalam',
            lang === 'ml' && !missing && '!pr-11',
            missing && 'border-dashed',
            busy && 'animate-pulse border-gold-400',
          )}
        />
        {/* Already in Malayalam: redoing it is there, but out of the way. */}
        {lang === 'ml' && !missing && value.en.trim() ? (
          <button
            type="button"
            onClick={toMalayalam}
            disabled={busy}
            title="Translate again from English, replacing this"
            aria-label="Translate again from English"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-sm text-[rgb(var(--muted))] opacity-60 transition hover:bg-gold-400/10 hover:text-gold-600 hover:opacity-100 disabled:opacity-30"
          >
            <Icon name="translate" className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {missing && value.en.trim() ? (
        <button
          type="button"
          onClick={toMalayalam}
          disabled={busy}
          className="flex items-center gap-1.5 self-start font-sans text-2xs text-gold-700 transition-colors hover:text-gold-500 disabled:opacity-40 dark:text-gold-300"
        >
          <Icon name="translate" className="h-3.5 w-3.5" />
          {busy ? 'Translating…' : 'Translate from English'}
        </button>
      ) : null}

      {failed ? (
        <p className="font-sans text-2xs text-burgundy-500 dark:text-burgundy-300">
          {failed} — write the Malayalam by hand.
        </p>
      ) : null}
    </div>
  )
}

function ImageField({ value, onChange }: { value: string; onChange: (next: Json) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    setBusy(true)
    setError('')
    try {
      const data = new FormData()
      data.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: data })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      onChange(json.path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const isImage = /\.(jpe?g|png|webp|avif)$/i.test(value)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {isImage && value ? (
        // Uploaded files are served straight from /public, so a plain img keeps
        // the editor free of next/image domain configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="h-20 w-28 shrink-0 rounded-sm border border-[rgb(var(--line))] object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="field" />
        <div className="flex items-center gap-3">
          <label className="btn-outline cursor-pointer !px-4 !py-2 !text-[0.6rem]">
            <Icon name="download" className="h-3.5 w-3.5 rotate-180" />
            {busy ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload(file)
                e.target.value = ''
              }}
            />
          </label>
          {error ? <span className="font-sans text-2xs text-burgundy-500">{error}</span> : null}
        </div>
      </div>
    </div>
  )
}

function ArrayField({
  value,
  onChange,
  path,
  depth,
}: {
  value: unknown[]
  onChange: (next: Json) => void
  path: string[]
  depth: number
}) {
  const [open, setOpen] = useState<number | null>(value.length === 1 ? 0 : null)
  const query = useContext(SearchContext)

  const primitive = value.every((item) => typeof item !== 'object' || item === null)

  // Entries kept on screen for a search, each with the place it really holds in
  // the list — deleting or reordering must act on the list, never on what the
  // search happens to be showing.
  const shown = value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !query || hasMatch(item, '', query))

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
    setOpen(to)
  }

  const remove = (index: number) => {
    const what = preview(value[index]) || `item ${index + 1}`
    // Deleting a notice or a memorial is not undoable from here, so ask first.
    if (!window.confirm(`Delete "${what}"? This cannot be undone from the dashboard.`)) return
    onChange(value.filter((_, i) => i !== index))
    setOpen(null)
  }

  /** New entries go to the top, where the newest notice or photograph belongs. */
  const add = () => {
    const template = value[0]
    const blank = template === undefined ? '' : withFreshId(blankLike(template))
    onChange([blank, ...value])
    setOpen(0)
  }

  const duplicate = (index: number) => {
    const copy = withFreshId(JSON.parse(JSON.stringify(value[index])))
    const next = [...value]
    next.splice(index + 1, 0, copy)
    onChange(next)
    setOpen(index + 1)
  }

  if (primitive) {
    return (
      <div className="flex flex-col gap-2">
        {shown.map(({ item, index: i }) => (
          <div key={i} className="flex gap-2">
            <JsonEditor
              value={item}
              path={path}
              depth={depth + 1}
              onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500"
              aria-label="Remove"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={add} className="btn-outline self-start !px-4 !py-2 !text-[0.6rem]">
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-sans text-2xs text-[rgb(var(--muted))]">
          {query ? (
            <>
              {shown.length} of {value.length} {value.length === 1 ? 'entry' : 'entries'} match
            </>
          ) : (
            <>
              {value.length} {value.length === 1 ? 'entry' : 'entries'}
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {value.length > 1 ? (
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:text-gold-500"
            >
              Collapse all
            </button>
          ) : null}
          <button type="button" onClick={add} className="btn-outline !px-4 !py-2 !text-[0.6rem]">
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add new
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-sm border border-dashed border-[rgb(var(--line))] px-3 py-4 text-center font-sans text-2xs text-[rgb(var(--muted))]">
          None of these say that.
        </p>
      ) : null}

      {shown.map(({ item, index: i }) => {
        // While searching, what is left is what was asked for: open it rather
        // than making somebody click through the answers one at a time.
        const expanded = query ? true : open === i
        return (
          <div
            key={i}
            className="overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--page))]"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-expanded={expanded}
              >
                <Icon
                  name="chevronDown"
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-gold-500 transition-transform duration-300',
                    expanded && 'rotate-180',
                  )}
                />
                <span className="truncate font-sans text-sm text-[rgb(var(--ink))]">
                  {preview(item) || `Item ${i + 1}`}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton label="Move up" icon="arrowUp" onClick={() => move(i, i - 1)} />
                <IconButton
                  label="Move down"
                  icon="arrowUp"
                  className="rotate-180"
                  onClick={() => move(i, i + 1)}
                />
                <IconButton label="Duplicate" icon="plus" onClick={() => duplicate(i)} />
                <IconButton label="Delete" icon="close" danger onClick={() => remove(i)} />
              </div>
            </div>
            {expanded ? (
              <div className="border-t border-[rgb(var(--line))] p-4">
                <SearchContext.Provider value={selfMatch(item, '', query) ? '' : query}>
                  <JsonEditor
                    value={item}
                    path={path}
                    depth={depth + 1}
                    onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
                  />
                </SearchContext.Provider>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function IconButton({
  label: title,
  icon,
  onClick,
  danger,
  className,
}: {
  label: string
  icon: string
  onClick: () => void
  danger?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-sm border border-transparent text-[rgb(var(--muted))] transition-colors',
        danger ? 'hover:border-burgundy-400 hover:text-burgundy-500' : 'hover:border-gold-400 hover:text-gold-500',
      )}
    >
      <Icon name={icon} className={cn('h-3.5 w-3.5', className)} />
    </button>
  )
}

/**
 * Gives a new or duplicated entry its own reference id, so two notices never
 * collide and nobody has to invent one.
 */
function withFreshId(item: unknown): unknown {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item
  const record = item as Record<string, unknown>
  if (typeof record.id !== 'string') return record
  const stem = record.id.replace(/[0-9]+$/, '') || 'item'
  return { ...record, id: `${stem}${Date.now().toString(36).slice(-5)}` }
}

/** Builds an empty record shaped like an existing sibling. */
function blankLike(template: unknown): unknown {
  if (isBilingual(template)) return { en: '', ml: '' }
  if (Array.isArray(template)) return []
  if (template && typeof template === 'object') {
    return Object.fromEntries(
      Object.entries(template as Record<string, unknown>).map(([k, v]) => [k, blankLike(v)]),
    )
  }
  if (typeof template === 'number') return 0
  if (typeof template === 'boolean') return false
  return ''
}
