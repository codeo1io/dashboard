import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {CLAIMS, REQUIRED_CLAIM_CATEGORIES} from './claims.ts'
import {buildNotification} from '../push/sw-notification.ts'

const pagePath = resolve(import.meta.dirname, '../../privacy.html')
const page = readFileSync(pagePath, 'utf8')
const pageText = page.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('public privacy policy content', () => {
  it('covers every required claim category', () => {
    const categoryEvidence: Record<(typeof REQUIRED_CLAIM_CATEGORIES)[number], RegExp> = {
      'stored-fields': /what is stored when you subscribe/i,
      'read-surface': /what you can read back/i,
      retention: /how long data is kept/i,
      deletion: /deleting your data/i,
      deactivation: /when a subscription stops being used/i,
      audit: /what is logged/i,
      'vapid-rotation': /rotating the signing key/i,
      relay: /who else receives your data/i,
      payload: /what notifications contain/i,
      'export-surface': /no separate export/i,
    }

    for (const category of REQUIRED_CLAIM_CATEGORIES) {
      expect(pageText, `missing ${category}`).toMatch(categoryEvidence[category])
    }
  })

  it('tells a reader how current the policy is', () => {
    // Presence and shape only. Asserting the literal date would make every
    // content edit a two-place change and the test would pin the very string
    // it exists to protect.
    expect(pageText).toMatch(/last updated\s+\d{1,2}\s+\w+\s+\d{4}/i)
  })

  it('publishes configurable retention durations without making guarantees', () => {
    const inactive = CLAIMS.inactiveRetention.value
    const tombstone = CLAIMS.tombstoneRetention.value

    expect(pageText).toMatch(new RegExp(`${inactive.amount} ${inactive.unit}.{0,80}(default|configurable)`, 'i'))
    expect(pageText).toMatch(new RegExp(`${tombstone.amount} ${tombstone.unit}.{0,80}(default|configurable)`, 'i'))
  })

  it('states the relay TTL and urgency disclosures', () => {
    expect(pageText).toMatch(/time-to-live of four weeks/i)
    expect(pageText).toMatch(/normal urgency/i)
    expect(pageText).not.toMatch(/sets no explicit/i)
  })

  it('discloses that a dispatch record identifies its triggering run', () => {
    // The Gateway sets a dispatch record's correlation id to the triggering
    // run/approval id, so the record is run-linkable. Describing it only as a
    // "correlation identifier" reads as an opaque trace value and understates
    // what is kept. This pins the disclosure against that regression.
    expect(pageText).toMatch(/run or approval that triggered/i)
    expect(pageText).not.toMatch(/never record.{0,120}run detail/i)
  })

  it('discloses the field discipline the shipped notification mapping enforces', () => {
    // Guardable since rm-1420 (was deliberately UNGUARDED before it): the
    // notification mapping in web/src/push/sw-notification.ts is this
    // repo's contract for what a push renders, so the page's disclosure is
    // pinned against shipped copy and shipped behavior — the page may not
    // drift from it, and shipped copy may not grow a kind the page does not
    // disclose.
    for (const type of ['approval', 'question', 'run_failed'] as const) {
      const rendered = buildNotification({data: {type}})
      expect(rendered.title).not.toBe('Fro Bot')
      const phrase = rendered.body.toLowerCase().replace(/\.$/, '')
      expect(pageText.toLowerCase()).toContain(phrase)
    }
    expect(pageText).toMatch(/three events/i)
    expect(pageText).not.toMatch(/two events/)
    // Main-line doctrine (PR 676): the gateway's own title/body are never
    // rendered — known and unrecognized kinds alike — and the module proves
    // it: an unknown kind with gateway text still renders the generic card.
    expect(pageText).toMatch(/title and body text are never rendered/i)
    expect(pageText).toMatch(/every other payload field is always discarded/i)
    expect(pageText).toMatch(/never include repository names, prompts/i)
    const unknownKind = buildNotification({title: 'Real title', body: 'Real body', data: {type: 'future-kind'}})
    expect(unknownKind.title).toBe('Fro Bot')
    expect(unknownKind.body).toBe('You have a new notification.')
  })

  it('does not expose private or internal values', () => {
    const urls = pageText.match(/https:\/\/[^\s<)]+/g) ?? []
    // Fork divergence: issues link points at this fork, not upstream fro-bot.
    expect(urls).toEqual(['https://github.com/codeo1io/dashboard/issues'])
    expect(pageText).not.toMatch(/[A-Za-z0-9_-]{80,}/)
    expect(pageText).not.toMatch(/\/operator\//)
    expect(pageText).not.toMatch(/(?<![\w.-])\d{7,}(?![\w.-])/)
    expect(page).not.toMatch(/<script\b/i)
  })
})
