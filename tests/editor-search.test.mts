import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import {
  MACHINE_KEYS,
  countFields,
  hasMatch,
  isBilingual,
  label,
  selfMatch,
  textOf,
} from '../src/lib/editor-search.ts'

/**
 * The search that decides what the dashboard shows.
 *
 * The danger here is not a crash. It is a search that quietly leaves out the
 * field somebody came to correct — they would conclude the site cannot do it,
 * and go back to telephoning the office. So the cases that matter are the ones
 * where a match is deep inside something, and the ones where a parent must be
 * kept on screen for a child's sake.
 */

const ministries = JSON.parse(readFileSync('content/ministries.json', 'utf-8'))
const units = ministries.items.find((m: { id: string }) => m.id === 'familyunits')

describe('what counts as one field', () => {
  test('a bilingual pair is one field, not two', () => {
    assert.equal(isBilingual({ en: 'Hall', ml: 'ഹാൾ' }), true)
    assert.equal(countFields({ en: 'Hall', ml: 'ഹാൾ' }), 1)
  })

  test('an object that merely has en and ml among other keys is not a pair', () => {
    assert.equal(isBilingual({ en: 'a', ml: 'b', phone: 'c' }), false)
  })

  test('the real ministries section is as large as the editor says', () => {
    // The number the search box prints. If this drifts, the box is lying.
    assert.ok(countFields(ministries) > 900, `expected over 900, got ${countFields(ministries)}`)
  })
})

describe('field names read as English', () => {
  test('camel case is broken apart and capitalised', () => {
    assert.equal(label('groupsDrilldown'), 'Groups Drilldown')
    assert.equal(label('leadPhone'), 'Lead Phone')
    assert.equal(label('name'), 'Name')
  })
})

describe('textOf reaches everything', () => {
  test('both sides of a bilingual pair', () => {
    assert.deepEqual(textOf({ en: 'Hall', ml: 'ഹാൾ' }).sort(), ['Hall', 'ഹാൾ'])
  })

  test('through arrays and nesting', () => {
    const found = textOf({ a: [{ b: { c: 'deep' } }] })
    assert.deepEqual(found, ['deep'])
  })

  test('numbers too, so a year or a fee can be searched', () => {
    assert.ok(textOf({ fee: 50 }).includes('50'))
  })

  test('null and undefined are not text', () => {
    assert.deepEqual(textOf({ a: null, b: undefined, c: 'x' }), ['x'])
  })
})

describe('hasMatch', () => {
  test('an empty search keeps everything, so the editor is unchanged until typing', () => {
    assert.equal(hasMatch({ anything: 'at all' }, 'whatever', ''), true)
  })

  test('matches on what a field says', () => {
    assert.equal(hasMatch({ en: 'Parish Council', ml: '' }, 'title', 'council'), true)
  })

  test('matches on what a field is called', () => {
    // Somebody looking for every telephone number on the page.
    assert.equal(hasMatch({ en: 'Joy', ml: '' }, 'phone', 'phone'), true)
  })

  test('is not case sensitive, either way round', () => {
    assert.equal(hasMatch({ en: 'JOMON', ml: '' }, 'name', 'jomon'), true)
    assert.equal(hasMatch({ en: 'jomon', ml: '' }, 'name', 'JOMON'), true)
  })

  test('finds a Malayalam word when only the English was written first', () => {
    assert.equal(hasMatch({ en: 'Bakery', ml: 'ബേക്കറി' }, 'title', 'ബേക്കറി'), true)
  })

  test('a parent is kept for the sake of a child deep inside it', () => {
    // This is the one that, if wrong, hides the answer entirely.
    assert.equal(hasMatch({ a: { b: { c: { d: 'needle' } } } }, 'top', 'needle'), true)
  })

  test('says no when nothing in the branch says it', () => {
    assert.equal(hasMatch({ en: 'Bakery', ml: 'ബേക്കറി' }, 'title', 'zzzz'), false)
  })
})

describe('against the real content', () => {
  test('a group leader buried seven levels down is findable by name', () => {
    const leader = units.groups[0].people[9]
    assert.ok(leader.name.en, 'expected a name to search for')
    // The whole document must stay on screen for that one person.
    assert.equal(hasMatch(ministries, 'ministries', leader.name.en), true)
    // And the unit they are in.
    assert.equal(hasMatch(units.groups[0], 'group', leader.name.en), true)
    // But no other unit should be kept on screen for them.
    const elsewhere = units.groups
      .slice(1)
      .filter((g: unknown) => hasMatch(g, 'group', leader.name.en))
    assert.equal(elsewhere.length, 0, 'a name matched a unit it is not in')
  })

  test('searching a telephone number narrows to the one person who has it', () => {
    const phone = units.groups[2].people[0].phone
    const hits = units.groups.filter((g: unknown) => hasMatch(g, 'group', phone))
    assert.equal(hits.length, 1)
  })

  test('searching a unit name keeps that unit and drops the other eleven', () => {
    const hits = units.groups.filter((g: { name: { en: string } }) =>
      hasMatch(g, 'group', "St. Peter's"),
    )
    assert.equal(hits.length, 1)
    assert.equal(hits[0].name.en, "St. Peter's Unit")
  })

  test('a search nobody could match leaves nothing behind', () => {
    assert.equal(hasMatch(ministries, 'ministries', 'qqzzxx'), false)
  })
})

describe('selfMatch — where the narrowing stops', () => {
  test('a person whose name was typed answers on their own account', () => {
    const person = units.groups[0].people[0]
    assert.equal(selfMatch(person, '', person.name.en), true)
  })

  test('a unit whose name was typed answers on its own account', () => {
    // So the unit opens whole — its fifteen names — instead of showing the
    // name field alone on an otherwise empty screen.
    const group = units.groups[0]
    assert.equal(selfMatch(group, '', "St. Peter's Unit"), true)
  })

  test('a unit does NOT answer for a name buried in its people', () => {
    // It still stays on screen, because hasMatch keeps it; but the narrowing
    // continues past it, down to the person actually asked for.
    const group = units.groups[0]
    const person = group.people[7]
    assert.equal(hasMatch(group, '', person.name.en), true)
    assert.equal(selfMatch(group, '', person.name.en), false)
  })

  test('a field name answers, so "phone" opens every telephone number', () => {
    assert.equal(selfMatch({ en: 'Joy', ml: '' }, 'phone', 'phone'), true)
  })

  test('an empty search answers for nothing', () => {
    assert.equal(selfMatch({ en: 'anything', ml: '' }, 'title', ''), false)
  })

  test('one person searched narrows to that person and nobody else', () => {
    const person = units.groups[5].people[3]
    const claimed = units.groups
      .flatMap((g: { people: unknown[] }) => g.people)
      .filter((p: unknown) => selfMatch(p, '', person.name.en))
    assert.equal(claimed.length, 1)
  })

  test('a role searched claims every person holding it, not the units', () => {
    const people = units.groups.flatMap((g: { people: unknown[] }) => g.people)
    const treasurers = people.filter((p: unknown) => selfMatch(p, '', 'Treasurer'))
    assert.equal(treasurers.length, 12, 'one treasurer per unit')
    const groupsClaiming = units.groups.filter((g: unknown) => selfMatch(g, '', 'Treasurer'))
    assert.equal(groupsClaiming.length, 0, 'a unit must not swallow a role search')
  })
})

describe('technical fields', () => {
  test('the ones a vicar should never have to think about are folded away', () => {
    for (const key of ['id', 'groupsDrilldown', 'combines']) {
      assert.ok(MACHINE_KEYS.has(key), `${key} should be folded away`)
    }
  })

  test('fields that are real parish content are never folded away', () => {
    // If any of these were hidden, somebody would think the site could not do it.
    for (const key of ['name', 'phone', 'title', 'date', 'image', 'role', 'active', 'until', 'places']) {
      assert.equal(MACHINE_KEYS.has(key), false, `${key} must stay visible`)
    }
  })
})
