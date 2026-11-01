import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

/**
 * That `.env.example` still describes the site it belongs to.
 *
 * This is not fussiness. A setting the code reads and the template never
 * mentions does not announce itself — it simply never gets into `.env.local`,
 * and the feature behind it is quietly off. That is exactly what happened to
 * the letters: MAIL_HOST was read by the mail module, documented in CLAUDE.md,
 * and absent from the template, so seven hundred and sixty-two letters were
 * written down and none of them were ever delivered to anybody.
 *
 * Nobody noticed, because the site is careful to fail softly. Softly enough
 * that only a test will catch it.
 */

/** Set by node and by whatever runs the process, never written by hand. */
const RUNTIME = new Set(['NODE_ENV', 'PORT', 'NEXT_RUNTIME'])

function documented() {
  const text = readFileSync('.env.example', 'utf-8')
  // A key counts as documented whether it is set or commented out, so long as
  // somebody setting the site up will read the name.
  return new Set([...text.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]))
}

function readByCode() {
  const out = execSync(
    "grep -rhoP 'process\\.env\\.\\K[A-Z][A-Z0-9_]+' src/ scripts/ next.config.mjs || true",
    { encoding: 'utf-8' },
  )
  return new Set(out.split('\n').filter(Boolean).filter((key) => !RUNTIME.has(key)))
}

describe('.env.example', () => {
  test('mentions every setting the code reads', () => {
    const missing = [...readByCode()].filter((key) => !documented().has(key)).sort()
    assert.deepEqual(
      missing,
      [],
      `these are read by the code but not in .env.example, so nobody will set them: ${missing.join(', ')}`,
    )
  })

  test('does not advertise settings nothing reads', () => {
    // A stale key is a person filling in something that does nothing.
    const stale = [...documented()].filter((key) => !readByCode().has(key)).sort()
    assert.deepEqual(stale, [], `in .env.example but nothing reads them: ${stale.join(', ')}`)
  })

  test('the whole mail block is there, or letters go nowhere', () => {
    const keys = documented()
    for (const key of ['MAIL_HOST', 'MAIL_FROM', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS']) {
      assert.ok(keys.has(key), `${key} missing — letters would be silently undelivered`)
    }
  })

  test('ships no password or secret of its own', () => {
    // A password printed in the repository is not a password.
    const text = readFileSync('.env.example', 'utf-8')
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*(ADMIN_PASSWORD|ADMIN_SESSION_SECRET|MAIL_PASS|[A-Z_]*SECRET|[A-Z_]*KEY)=(.*)$/)
      if (!match) continue
      const value = match[2].trim()
      const placeholder = !value || /^<.*>$|^change-me/i.test(value)
      assert.ok(placeholder, `${match[1]} carries a real-looking value in .env.example: ${value}`)
    }
  })
})
