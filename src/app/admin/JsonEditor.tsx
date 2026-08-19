'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
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

function isBilingual(value: unknown): value is { en: string; ml: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'en' in (value as object) &&
    'ml' in (value as object) &&
    Object.keys(value as object).length === 2
  )
}

function label(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

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
        <Field {...props} />
      </DocumentContext.Provider>
    )
  }
  return <Field {...props} />
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
    const record = value as Record<string, unknown>
    // Reference ids go last: they matter to the site, not to the person typing.
    const entries = Object.entries(record).sort(
      (a, b) => Number(QUIET_KEYS.has(a[0])) - Number(QUIET_KEYS.has(b[0])),
    )
    return (
      <div className={cn('flex flex-col gap-5', depth > 0 && 'border-l border-stone-300/60 pl-5 dark:border-navy-700')}>
        {entries.map(([childKey, childValue]) => (
          <Row key={childKey} name={childKey} value={childValue}>
            <JsonEditor
              value={childValue}
              onChange={(next) => onChange({ ...record, [childKey]: next })}
              path={[...path, childKey]}
              depth={depth + 1}
            />
          </Row>
        ))}
      </div>
    )
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

  if (DATE_KEYS.has(key) && /^\d{4}-\d{2}-\d{2}/.test(text)) {
    return <DateField value={text} onChange={onChange} />
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
 * A calendar picker for the date part, so nobody has to remember that the site
 * wants ISO order. A stored time ("2026-08-10T15:30:00+05:30") keeps its tail.
 */
function DateField({ value, onChange }: { value: string; onChange: (next: Json) => void }) {
  const [date, ...rest] = value.split('T')
  const tail = rest.length ? `T${rest.join('T')}` : ''

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}${tail}` : '')}
        className="field max-w-[14rem] tabular-nums"
      />
      {tail ? (
        <span className="font-sans text-2xs text-[rgb(var(--muted))]">
          keeps the time {tail.slice(1, 6)}
        </span>
      ) : null}
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
  const long = LONG_KEYS.has(name) || value.en.length > 110
  const Field = long ? 'textarea' : 'input'
  const [busy, setBusy] = useState<'en' | 'ml' | null>(null)
  const [failed, setFailed] = useState('')
  const { enabled, translate } = useAutoTranslate()

  // Which box was typed in most recently. Editing English then leaving the
  // field rewrites the Malayalam, and the other way round; whichever side was
  // touched last is treated as the truth.
  const edited = useRef({ en: 0, ml: 0 })
  const order = useRef(0)
  // Source text already translated once, so tabbing back through an untouched
  // field does not fire the same request again.
  const done = useRef({ en: '', ml: '' })

  /** Translates one side into the other. `force` overwrites existing text. */
  const run = useCallback(
    async (from: 'en' | 'ml', force: boolean) => {
      const to = from === 'en' ? 'ml' : 'en'
      const source = value[from].trim()
      if (!source) return
      if (!force && value[to].trim()) return

      setBusy(to)
      setFailed('')
      try {
        const text = await translate(source, from, to)
        done.current[from] = source
        if (text) onChange({ ...value, [to]: text })
      } catch (e) {
        setFailed(e instanceof Error ? e.message : 'Translation failed')
      } finally {
        setBusy(null)
      }
    },
    [value, onChange, translate],
  )

  /** Called when a box loses focus — decides whether the other side is stale. */
  const sync = useCallback(
    (from: 'en' | 'ml') => {
      if (!enabled) return
      const to = from === 'en' ? 'ml' : 'en'
      const source = value[from].trim()
      if (!source || source === done.current[from]) return
      // Fill an empty box always; overwrite a filled one only when this side is
      // the one that was just edited, so hand-written text is never clobbered
      // by merely clicking through a field.
      if (!value[to].trim() || edited.current[from] > edited.current[to]) run(from, true)
    },
    [enabled, value, run],
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {(['en', 'ml'] as const).map((code) => (
          <label key={code} className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2">
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.18em] text-gold-600/80 dark:text-gold-400/80">
                {code === 'en' ? 'English' : 'മലയാളം'}
              </span>
              <button
                type="button"
                onClick={() => run(code === 'en' ? 'ml' : 'en', true)}
                disabled={busy !== null || !value[code === 'en' ? 'ml' : 'en'].trim()}
                title={
                  code === 'en'
                    ? 'Translate the Malayalam into English, replacing this box'
                    : 'Translate the English into Malayalam, replacing this box'
                }
                className="flex items-center gap-1 font-sans text-[0.58rem] uppercase tracking-[0.12em] text-[rgb(var(--muted))] transition-colors hover:text-gold-500 disabled:opacity-30"
              >
                <Icon name="translate" className="h-3 w-3" />
                {busy === code ? 'translating…' : 'translate'}
              </button>
            </span>
            <Field
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ rows: long ? 5 : undefined } as any)}
              value={value[code]}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                edited.current[code] = ++order.current
                onChange({ ...value, [code]: e.target.value })
              }}
              // Typing in one box and moving on rewrites the other one.
              onBlur={() => sync(code)}
              className={cn(
                'field',
                long && 'resize-y',
                code === 'ml' && 'font-malayalam',
                busy === code && 'animate-pulse border-gold-400',
              )}
            />
          </label>
        ))}
      </div>

      {failed ? (
        <p className="font-sans text-[0.6rem] text-burgundy-500 dark:text-burgundy-300">
          {failed} — type the other language by hand.
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

  const primitive = value.every((item) => typeof item !== 'object' || item === null)

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
        {value.map((item, i) => (
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
          {value.length} {value.length === 1 ? 'entry' : 'entries'}
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

      {value.map((item, i) => {
        const expanded = open === i
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
                <JsonEditor
                  value={item}
                  path={path}
                  depth={depth + 1}
                  onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
                />
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
