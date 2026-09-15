/**
 * Rebuild and restart in one step.
 *
 *   npm run restart
 *
 * Building while `npm start` is still running is the one way to break this site
 * without touching the code: the new HTML asks for a stylesheet the running
 * process no longer knows about, the browser gets a 400, and the page paints
 * with no styles at all — dark blocks, giant images, nothing where it belongs.
 *
 * This stops the server first, clears the build, builds, and starts again.
 */
import { execSync, spawn } from 'node:child_process'
import { rmSync } from 'node:fs'

const PORT = Number(process.env.PORT) || 3000

function stopServer() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf-8' })
      const pids = new Set(
        out
          .split('\n')
          .filter((line) => line.includes('LISTENING'))
          .map((line) => line.trim().split(/\s+/).pop())
          .filter(Boolean),
      )
      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        console.log(`stopped the server on port ${PORT} (pid ${pid})`)
      }
    } else {
      execSync(`lsof -ti tcp:${PORT} | xargs -r kill -9`, { stdio: 'ignore' })
    }
  } catch {
    console.log(`nothing was listening on port ${PORT}`)
  }
}

stopServer()

console.log('clearing .next …')
rmSync('.next', { recursive: true, force: true })

console.log('building …')
execSync('npm run build', { stdio: 'inherit' })

console.log(`starting on http://localhost:${PORT} …`)
spawn('npm', ['start'], { stdio: 'inherit', shell: true })
