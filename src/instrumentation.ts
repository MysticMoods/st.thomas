/**
 * Runs once when the server starts.
 *
 * The work lives in instrumentation-node.ts. Next also compiles this file for
 * the edge runtime, where node:crypto and the disk do not exist; importing
 * behind this exact test is what lets the bundler leave all of it out there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
}
