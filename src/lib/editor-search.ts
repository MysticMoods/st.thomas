/**
 * Finding one field among a thousand.
 *
 * The dashboard edits a whole content section at a time, and the largest of
 * them — the ministries, with twelve family units and fifteen names in each —
 * is over a thousand fields in seven levels of nesting. Correcting one group
 * leader's telephone number meant opening all of it and hunting down the tree.
 *
 * These decide what a search leaves on the screen. They are here, apart from
 * the editor that draws it, because they are the part that can be wrong in a
 * way nobody would notice: a search that quietly hides the field somebody came
 * for is worse than no search at all.
 */

/** A bilingual pair is one field to the person typing, not two. */
export function isBilingual(value: unknown): value is { en: string; ml: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'en' in (value as object) &&
    'ml' in (value as object) &&
    Object.keys(value as object).length === 2
  )
}

/** `groupsDrilldown` -> `Groups Drilldown`, so a field reads as English. */
export function label(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/**
 * Every string a value holds, both sides of a bilingual pair included — so a
 * Malayalam word finds the entry whose English was written first, and a
 * telephone number finds the person it belongs to.
 */
export function textOf(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string' || typeof value === 'number') into.push(String(value))
  else if (Array.isArray(value)) value.forEach((item) => textOf(item, into))
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => textOf(item, into))
  }
  return into
}

/**
 * Whether this branch is worth showing.
 *
 * A branch matches on what it says or on what it is called, and a branch whose
 * child matches must stay on screen too, or the child would have nowhere to
 * appear. So the question is asked of the whole subtree, never of one field.
 *
 * An empty search matches everything, which is what makes the editor behave
 * exactly as it always did until somebody types.
 */
export function hasMatch(value: unknown, key: string, query: string): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  if (label(key).toLowerCase().includes(needle)) return true
  return textOf(value).some((text) => text.toLowerCase().includes(needle))
}

/**
 * Whether this branch is itself what was asked for, rather than merely holding
 * it somewhere below.
 *
 * The difference decides what a search is worth. Typing a unit's name should
 * open that unit — its fifteen names and their numbers — not leave the name
 * field sitting alone on an empty screen, which is what filtering every level
 * the same way produces. So: once a branch answers on its own account, it is
 * shown whole and nothing inside it is filtered any further.
 *
 * "On its own account" means this node's own label, or text sitting directly on
 * it — a name, a role, a telephone number. Text further down belongs to the
 * child that holds it, and that child will claim it.
 */
export function selfMatch(value: unknown, key: string, query: string): boolean {
  if (!query) return false
  const needle = query.toLowerCase()
  if (label(key).toLowerCase().includes(needle)) return true

  const says = (item: unknown) => textOf(item).some((text) => text.toLowerCase().includes(needle))

  if (typeof value === 'string' || typeof value === 'number') return says(value)
  if (isBilingual(value)) return says(value)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return Object.entries(value as Record<string, unknown>).some(([childKey, child]) => {
    const shallow =
      typeof child === 'string' || typeof child === 'number' || isBilingual(child)
    return shallow && (says(child) || label(childKey).toLowerCase().includes(needle))
  })
}

/** How many fields a section holds, so the search box can say what it searches. */
export function countFields(value: unknown): number {
  if (isBilingual(value)) return 1
  if (Array.isArray(value)) return value.reduce<number>((n, item) => n + countFields(item), 0)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (n, item) => n + countFields(item),
      0,
    )
  }
  return 1
}

/**
 * Fields that keep the site working and mean nothing to the person typing.
 *
 * They are real and occasionally have to be changed, so they are not removed —
 * they are folded behind one line, out of the path of somebody who came to
 * correct a telephone number. A vicar should never have to wonder what
 * `groupsDrilldown` is, or be one keystroke from breaking an id that a memorial
 * link already points at.
 */
export const MACHINE_KEYS = new Set(['id', 'combines', 'groupsDrilldown', 'channel', 'slug'])
