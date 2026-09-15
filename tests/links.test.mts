import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { MAX_MAILTO_BODY, mailtoLink, whatsappLink, whatsappNumber } from '../src/lib/reply.ts'
import { idFromSlug, memorialSlug, slugify } from '../src/lib/slug.ts'
import { youtubeId, youtubeThumb } from '../src/lib/youtube.ts'
import { isEmail, telHref } from '../src/lib/utils.ts'

/**
 * The small functions that turn what somebody typed into a link.
 *
 * Every one of them takes text a parishioner or an advertiser wrote by hand, in
 * whatever shape they wrote it, and none of them may throw or produce a link
 * that goes somewhere wrong. A wrong WhatsApp number reaches a stranger; a
 * broken memorial slug breaks a link a family has already sent round.
 */

describe('whatsappNumber', () => {
  const cases: [string, string, string][] = [
    ['9847012345', '919847012345', 'ten digits, as most people write it'],
    ['98470 12345', '919847012345', 'with the usual space'],
    ['+91 98470 12345', '919847012345', 'already carrying the country code'],
    ['098470 12345', '919847012345', 'with the old trunk zero'],
    ['+91-98470-12345', '919847012345', 'hyphenated'],
    ['919847012345', '919847012345', 'bare, with country code'],
    ['', '', 'nothing at all'],
    ['abcd', '', 'not a number'],
    ['12345', '', 'too short to be anybody'],
    ['9847012345678901234', '', 'too long to be anybody'],
  ]
  for (const [input, want, why] of cases) {
    test(why, () => assert.equal(whatsappNumber(input), want))
  }

  test('a number it cannot read gives no link at all', () => {
    // Better no button than a button that opens a stranger's chat.
    assert.equal(whatsappLink('rubbish', 'hello'), '')
  })

  test('the message is carried into the link', () => {
    const link = whatsappLink('98470 12345', 'Dear Joy, your certificate is ready.')
    assert.match(link, /^https:\/\/wa\.me\/919847012345\?text=/)
    assert.match(link, /certificate/)
  })
})

describe('mailtoLink', () => {
  test('addresses the office mail programme and writes the letter', () => {
    const link = mailtoLink('joy@example.com', 'Re: Baptism certificate', 'Dear Joy,\nAttached.')
    assert.match(link, /^mailto:joy%40example\.com\?/)
    assert.match(link, /subject=Re%3A%20Baptism%20certificate/)
    assert.match(link, /body=Dear%20Joy/)
  })

  test('spaces never reach the mail client as plus signs', () => {
    // URLSearchParams writes '+', which several clients show literally.
    assert.equal(mailtoLink('a@b.com', 'two words', 'three more words').includes('+'), false)
  })

  test('no address means no link, so no button is offered', () => {
    assert.equal(mailtoLink('', 's', 'b'), '')
    assert.equal(mailtoLink('not-an-address', 's', 'b'), '')
  })

  test('a long answer is shortened for the mail client, not lost', () => {
    const long = 'x'.repeat(5000)
    const link = mailtoLink('a@b.com', 's', long)
    const body = new URL(link).searchParams.get('body') ?? ''
    assert.equal(body.length, MAX_MAILTO_BODY)
  })
})

describe('memorial slugs', () => {
  test('reads as the person, and ends in their id', () => {
    assert.equal(
      memorialSlug({ id: 'ob01', name: { en: 'Thresiamma Devassy', ml: 'ത്രേസ്യാമ്മ' } }),
      'thresiamma-devassy-ob01',
    )
  })

  test('a name written only in Malayalam falls back to the id alone', () => {
    assert.equal(memorialSlug({ id: 'ob07', name: { en: '', ml: 'ത്രേസ്യാമ്മ' } }), 'ob07')
  })

  test('correcting a spelling never breaks a link already sent', () => {
    // Only the id is used to find them — that is the whole design.
    const before = memorialSlug({ id: 'ob01', name: { en: 'Thresiama Devassy', ml: '' } })
    const after = memorialSlug({ id: 'ob01', name: { en: 'Thresiamma Devassy', ml: '' } })
    assert.notEqual(before, after)
    assert.equal(idFromSlug(before), 'ob01')
    assert.equal(idFromSlug(after), 'ob01')
  })

  test('a slug with no dashes is its own id', () => {
    assert.equal(idFromSlug('ob01'), 'ob01')
  })

  test('slugify keeps it short and latin', () => {
    assert.equal(slugify('  Fr. Thomas   Kalapurackal!! '), 'fr-thomas-kalapurackal')
    assert.ok(slugify('a'.repeat(200)).length <= 60)
    assert.equal(slugify('ത്രേസ്യാമ്മ'), '')
  })
})

describe('youtubeId', () => {
  const ID = 'aqz-KE-bpKQ'
  const good = [
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://m.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=42s',
    'https://www.youtube.com/watch?list=PLxyz&v=aqz-KE-bpKQ',
    'https://youtu.be/aqz-KE-bpKQ',
    'https://youtu.be/aqz-KE-bpKQ?t=90',
    'https://www.youtube.com/embed/aqz-KE-bpKQ',
    'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
    'https://www.youtube.com/shorts/aqz-KE-bpKQ',
    'https://www.youtube.com/live/aqz-KE-bpKQ',
    'https://www.youtube.com/v/aqz-KE-bpKQ',
    '  aqz-KE-bpKQ  ',
  ]
  for (const link of good) {
    test(`reads ${link.slice(0, 46)}`, () => assert.equal(youtubeId(link), ID))
  }

  const bad = ['', 'not a link', 'https://vimeo.com/12345678901', 'https://example.com/watch?v=aqz-KE-bpKQ']
  for (const link of bad) {
    test(`refuses ${JSON.stringify(link).slice(0, 46)}`, () => assert.equal(youtubeId(link), ''))
  }

  test('the thumbnail is on the host next.config allows', () => {
    assert.equal(youtubeThumb(ID), 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg')
  })
})

describe('addresses and telephone links', () => {
  test('accepts what a parishioner actually types', () => {
    assert.equal(isEmail('joy@example.com'), true)
    assert.equal(isEmail('  joy@example.com '), true)
  })

  test('refuses what is not an address', () => {
    for (const bad of ['', 'joy', 'joy@', '@example.com', 'joy@example', 'a b@example.com']) {
      assert.equal(isEmail(bad), false, bad)
    }
  })

  test('a telephone link carries only what a phone can dial', () => {
    assert.equal(telHref('+91 98470 12345'), 'tel:+919847012345')
    assert.equal(telHref('(0487) 2345 678'), 'tel:04872345678')
  })
})
