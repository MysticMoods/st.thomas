/*
 * Checks the mail settings in .env.local, and sends one test letter.
 *
 *   npm run mail:test                 # sends to MAIL_OFFICE (or MAIL_FROM)
 *   npm run mail:test -- you@x.com    # sends to that address
 *
 * Prints what went wrong in plain words when it fails. Never prints the password.
 */
import { readFileSync } from 'node:fs'

import nodemailer from 'nodemailer'

const env = {}
for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].trim()
}

const missing = ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM'].filter((k) => !env[k])
if (missing.length) {
  console.error(`Not set in .env.local: ${missing.join(', ')}`)
  process.exit(1)
}

const port = Number(env.MAIL_PORT) || 587
const transport = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port,
  secure: env.MAIL_SECURE ? env.MAIL_SECURE === 'true' : port === 465,
  auth: { user: env.MAIL_USER, pass: env.MAIL_PASS.replace(/\s+/g, '') },
  connectionTimeout: 15_000,
})

const to = process.argv[2] || env.MAIL_OFFICE || env.MAIL_FROM
console.log(`Server  ${env.MAIL_HOST}:${port}`)
console.log(`Login   ${env.MAIL_USER}`)
try {
  await transport.verify()
  console.log('Login   ok')
} catch (error) {
  const text = String(error?.message || error)
  console.error(`Login   FAILED — ${text}`)
  if (/535|Username and Password not accepted|BadCredentials/i.test(text)) {
    console.error('        Gmail refused the password. Use an app password, not the normal one.')
  }
  process.exit(1)
}

const info = await transport.sendMail({
  from: env.MAIL_FROM,
  to,
  subject: 'Test letter — St. Thomas Church website',
  text: 'If you can read this, the website can send letters.\n\nSt. Thomas Church, Mangalassery',
})
console.log(`Sent    to ${to} (${info.messageId})`)
console.log('Check that inbox, and the spam folder.')
