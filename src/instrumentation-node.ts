import { sweepRetired } from './lib/retire'

/**
 * Replaced photographs are deleted fourteen days after they stopped being used
 * (lib/retire.ts). Saves check on their way past, but a quiet fortnight has no
 * saves, so the server also looks every six hours by itself.
 */
const SIX_HOURS = 6 * 60 * 60 * 1000
setTimeout(() => void sweepRetired(), 60_000).unref?.()
setInterval(() => void sweepRetired(), SIX_HOURS).unref?.()
