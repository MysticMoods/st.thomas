import path from 'node:path'

import nodemailer, { type Transporter } from 'nodemailer'

import { appendRecord, readRecords, writeJson } from './content'

/**
 * Letters out.
 *
 * Until now every form on this site was a one-way drop into a JSON file: a
 * family sent a hall request and heard nothing, so they rang the office anyway.
 * This is the half that was missing.
 *
 * Two rules hold everywhere in here:
 *
 *  1. **A letter never fails a visitor's request.** If the mail server is down,
 *     the booking is still taken and the message still saved; the letter is
 *     marked failed in the outbox for somebody to look at.
 *  2. **Nothing is lost when mail is not set up at all.** With no MAIL_HOST the
 *     letters are still written to the outbox, so the parish can see exactly
 *     what would have gone out — and the dashboard says plainly that none of it
 *     is being delivered.
 */

const OUTBOX = path.join(process.cwd(), 'content', 'outbox.json')
const KEEP = 400

export type Letter = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  /** What this letter is, for the outbox. */
  kind: string
}

export type Sent = {
  id: string
  at: string
  to: string
  subject: string
  kind: string
  status: 'sent' | 'failed' | 'not-configured'
  error?: string
}

/** True once the parish has given the site somewhere to post from. */
export function mailConfigured() {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_FROM)
}

/** Where notifications for the parish itself go. */
export function officeAddress() {
  return process.env.MAIL_OFFICE || process.env.MAIL_FROM || ''
}

/** The site's own address, for links inside letters. */
export function siteUrl() {
  return (process.env.SITE_URL || 'https://stthomasmangalassery.in').replace(/\/$/, '')
}

let transport: Transporter | null = null

function transporter() {
  if (transport) return transport
  const port = Number(process.env.MAIL_PORT) || 587
  transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    // Port 465 speaks TLS from the first byte; 587 starts plain and upgrades.
    secure: process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' : port === 465,
    auth: process.env.MAIL_USER
      ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  return transport
}

async function remember(entry: Sent) {
  try {
    await appendRecord('outbox', entry)
  } catch {
    /* the outbox is a record, not a requirement */
  }
}

/**
 * Posts one letter. Always resolves — the caller is in the middle of serving
 * somebody, and a mail server having a bad afternoon is not their problem.
 */
export async function send(letter: Letter): Promise<Sent> {
  const base: Omit<Sent, 'status'> = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    to: letter.to,
    subject: letter.subject,
    kind: letter.kind,
  }

  if (!letter.to || !letter.to.includes('@')) {
    const entry: Sent = { ...base, status: 'failed', error: 'No address to send to' }
    await remember(entry)
    return entry
  }

  if (!mailConfigured()) {
    const entry: Sent = { ...base, status: 'not-configured' }
    await remember(entry)
    return entry
  }

  try {
    await transporter().sendMail({
      from: process.env.MAIL_FROM,
      to: letter.to,
      replyTo: letter.replyTo,
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
    })
    const entry: Sent = { ...base, status: 'sent' }
    await remember(entry)
    return entry
  } catch (error) {
    const entry: Sent = {
      ...base,
      status: 'failed',
      error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
    }
    await remember(entry)
    return entry
  }
}

/**
 * Posts a letter without making the caller wait, and without letting it throw.
 * Used on the public forms, where the visitor should see their confirmation the
 * moment their request is safely written down.
 */
export function post(letter: Letter) {
  void send(letter).catch(() => {})
}

export async function readOutbox(): Promise<Sent[]> {
  return (await readRecords('outbox')) as Sent[]
}

export async function clearOutbox() {
  await writeJson(OUTBOX, [])
}

/** Checks the settings actually work, without sending anything to anybody. */
export async function verifyMail(): Promise<{ ok: boolean; error?: string }> {
  if (!mailConfigured()) return { ok: false, error: 'MAIL_HOST and MAIL_FROM are not set.' }
  try {
    await transporter().verify()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: (error instanceof Error ? error.message : String(error)).slice(0, 300) }
  }
}

export const KEEP_LETTERS = KEEP
