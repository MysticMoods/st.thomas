import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, test } from 'node:test'

import { CONTENT_KEYS, type ContentKey } from '../src/lib/types.ts'
import {
  AREAS,
  type Area,
  ROLE_LABELS,
  type Role,
  areasOf,
  asRole,
  deniedSections,
  isRole,
  may,
  mayEditSection,
  mayManagePeople,
} from '../src/lib/permissions.ts'

/**
 * Who may do what.
 *
 * The dangerous direction here is only one: somebody being allowed something
 * they should not be. A jurisdiction that is too tight is a complaint; one that
 * is too loose is the treasurer's ledger read by whoever looks after the hall,
 * or the parish's sent letters wiped by somebody correcting a photograph. So
 * most of what follows asserts a `false`.
 */

const ROLES = Object.keys(ROLE_LABELS) as Role[]
const SECTIONS = CONTENT_KEYS

describe('the role list', () => {
  test('is closed — anything unrecognised becomes an editor, never an owner', () => {
    for (const junk of ['', 'admin', 'root', 'OWNER', 'superuser', undefined, null, 7, {}]) {
      assert.equal(isRole(junk), false, String(junk))
      assert.notEqual(asRole(junk), 'owner', `${String(junk)} must not become an owner`)
    }
    assert.equal(asRole(undefined), 'editor')
  })

  test('every role is spelled out for whoever is choosing one', () => {
    for (const role of ROLES) {
      assert.ok(ROLE_LABELS[role].name, `${role} has no name`)
      assert.ok(ROLE_LABELS[role].blurb.length > 20, `${role} is not explained`)
    }
  })
})

describe('owner', () => {
  test('may work in every area there is', () => {
    for (const area of AREAS) assert.equal(may('owner', area), true, area)
  })
  test('is the only role that may manage people', () => {
    for (const role of ROLES) {
      assert.equal(mayManagePeople(role), role === 'owner', role)
    }
  })
  test('is the only role that may touch backups, the log and the outbox', () => {
    for (const role of ROLES) {
      assert.equal(may(role, 'system'), role === 'owner', role)
    }
  })
})

describe('editor keeps what it always had', () => {
  // The upgrade must not have taken work away from anybody overnight.
  test('still does the pages, hall, office, messages and newsletter', () => {
    for (const area of ['pages', 'hall', 'office', 'messages', 'newsletter'] as Area[]) {
      assert.equal(may('editor', area), true, area)
    }
  })
  test('still cannot make accounts or restore a backup — as before', () => {
    assert.equal(may('editor', 'people'), false)
    assert.equal(may('editor', 'system'), false)
  })
  test('cannot read what people have given', () => {
    assert.equal(may('editor', 'giving'), false)
  })
})

describe('hall manager', () => {
  test('may take bookings and moderate reviews', () => {
    assert.equal(may('hall', 'hall'), true)
  })
  test('may not answer the parish office, read messages, or send the newsletter', () => {
    for (const area of ['office', 'messages', 'newsletter'] as Area[]) {
      assert.equal(may('hall', area), false, area)
    }
  })
  test('may not read the giving, make accounts, or wipe the outbox', () => {
    for (const area of ['giving', 'people', 'system'] as Area[]) {
      assert.equal(may('hall', area), false, area)
    }
  })
})

describe('treasurer', () => {
  test('sees the giving', () => {
    assert.equal(may('treasurer', 'giving'), true)
  })
  test('and nothing else at all', () => {
    for (const area of AREAS.filter((a) => a !== 'giving')) {
      assert.equal(may('treasurer', area), false, area)
    }
  })
  test('cannot edit a single page of the site', () => {
    assert.equal(mayEditSection('treasurer', undefined, 'notices'), false)
    assert.equal(mayEditSection('treasurer', ['notices'], 'notices'), false)
  })
})

describe('sacristan — everything except the hall and the advertisements', () => {
  test('runs the office, the messages, the newsletter and the pages', () => {
    for (const area of ['pages', 'office', 'messages', 'newsletter', 'giving'] as Area[]) {
      assert.equal(may('sacristan', area), true, area)
    }
  })

  test('does not let the hall', () => {
    assert.equal(may('sacristan', 'hall'), false)
  })

  test('may not touch the advertisements', () => {
    assert.equal(mayEditSection('sacristan', undefined, 'ads'), false)
  })

  test('may edit every other page', () => {
    for (const key of ['mass', 'notices', 'clergy', 'about', 'donation', 'hall'] as const) {
      assert.equal(mayEditSection('sacristan', undefined, key), true, key)
    }
  })

  test('is not given the accounts or the backups — those are the priest\u2019s', () => {
    assert.equal(may('sacristan', 'people'), false)
    assert.equal(may('sacristan', 'system'), false)
  })
})

describe('parish administration — everything except four pages', () => {
  test('runs the day to day, the hall included', () => {
    for (const area of ['pages', 'hall', 'office', 'messages', 'newsletter', 'giving'] as Area[]) {
      assert.equal(may('administration', area), true, area)
    }
  })

  test('may not change the priest\u2019s own details', () => {
    assert.equal(mayEditSection('administration', undefined, 'clergy'), false)
  })

  test('may not change the parish history, nor the priests before', () => {
    assert.equal(mayEditSection('administration', undefined, 'about'), false)
    assert.equal(mayEditSection('administration', undefined, 'past-priests'), false)
  })

  test('may not change the bank account or the UPI handle', () => {
    assert.equal(mayEditSection('administration', undefined, 'donation'), false)
  })

  test('may still edit everything else', () => {
    const denied = new Set(deniedSections('administration'))
    for (const key of SECTIONS) {
      if (denied.has(key)) continue
      assert.equal(mayEditSection('administration', undefined, key), true, key)
    }
  })

  test('a refusal cannot be undone by granting the page to one person', () => {
    // The per-person list narrows what a role holds. It must never widen it,
    // or the one thing the priest kept back could be handed over by accident.
    assert.equal(mayEditSection('administration', ['clergy', 'donation'], 'clergy'), false)
    assert.equal(mayEditSection('administration', ['clergy', 'donation'], 'donation'), false)
  })

  test('and still may not make accounts or restore a backup', () => {
    assert.equal(may('administration', 'people'), false)
    assert.equal(may('administration', 'system'), false)
  })
})

describe('a page added later', () => {
  test('falls to the administration, and never to the four held back', () => {
    // Written as a refusal rather than a list of what is allowed, so that a
    // section added next year is theirs without anybody remembering to say so.
    const newSection = 'ads' as ContentKey // any key not in their deny list
    assert.equal(mayEditSection('administration', undefined, newSection), true)
    for (const held of deniedSections('administration')) {
      assert.equal(mayEditSection('administration', undefined, held), false, held)
    }
  })
})

describe('which pages somebody may edit', () => {
  test('no list means every section — what an old account has', () => {
    assert.equal(mayEditSection('editor', undefined, 'mass'), true)
    assert.equal(mayEditSection('editor', [], 'mass'), true)
  })

  test('a list means exactly those, and nothing else', () => {
    assert.equal(mayEditSection('hall', ['hall'], 'hall'), true)
    assert.equal(mayEditSection('hall', ['hall'], 'mass'), false)
    assert.equal(mayEditSection('hall', ['hall'], 'donation'), false)
  })

  test('a role without pages is refused however generous the list', () => {
    // The list narrows; it never grants.
    assert.equal(mayEditSection('treasurer', ['mass', 'hall', 'donation'], 'mass'), false)
  })

  test('a youth coordinator gets their three and no more', () => {
    const theirs = ['ministries', 'gallery', 'media'] as const
    for (const key of theirs) assert.equal(mayEditSection('editor', theirs, key), true, key)
    for (const key of ['mass', 'donation', 'committee', 'site'] as const) {
      assert.equal(mayEditSection('editor', theirs, key), false, key)
    }
  })
})

describe('saving a section', () => {
  /**
   * The stale-tab guard used to be optional: the route checked the version only
   * when one was offered, so a save that simply left the field out replaced the
   * whole section with whatever it sent. It was found by a permission probe
   * that blanked five content files in one command — restored from the app's
   * own rolling backups, which is the only reason this is a story and not a
   * loss.
   */
  const source = readFileSync('src/app/api/admin/content/[key]/route.ts', 'utf-8')

  test('refuses a save that does not say which version it was built on', () => {
    assert.match(
      source,
      /if \(!version\)/,
      'the version must be required, not merely checked when offered',
    )
  })

  test('never treats a missing version as permission to overwrite', () => {
    assert.doesNotMatch(
      source,
      /if \(version && version !== current\)/,
      'a missing version would skip the check entirely',
    )
  })
})

describe('every dashboard route is actually guarded', () => {
  /**
   * The guard is the lock; hiding a panel is only tidiness. A route added later
   * without one would be open to anybody who can sign in, and nothing on the
   * screen would say so.
   */
  const dir = 'src/app/api/admin'
  const routes = readdirSync(dir, { recursive: true, encoding: 'utf-8' })
    .filter((name) => name.endsWith('route.ts'))

  /** These decide for themselves, for reasons written in each file. */
  const OWN_RULES = new Set([
    'login/route.ts', // no session yet, by definition
    'logout/route.ts', // anybody signed in may sign out
    'users/route.ts', // requireOwner, plus an editor changing their own password
    'reply/route.ts', // the area depends on which queue is being answered
    'content/[key]/route.ts', // depends on which section
  ])

  test('found the routes to check', () => {
    assert.ok(routes.length >= 15, `only found ${routes.length}`)
  })

  for (const route of routes) {
    if (OWN_RULES.has(route)) continue
    test(`${route} calls requireArea`, () => {
      const source = readFileSync(`${dir}/${route}`, 'utf-8')
      assert.match(
        source,
        /requireArea\('[a-z]+'\)/,
        `${route} has no area guard — anybody signed in could use it`,
      )
    })
  }

  test('the ones with their own rules still check something', () => {
    for (const route of OWN_RULES) {
      if (route === 'login/route.ts') continue
      const source = readFileSync(`${dir}/${route}`, 'utf-8')
      assert.match(
        source,
        /currentSession|requireOwner|requireArea|canEditSection/,
        `${route} checks nothing at all`,
      )
    }
  })
})
