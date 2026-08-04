// Minimal static file server for the example remote module's built bundle.
//
// A real third-party module would serve its config-page.js from its own HTTP
// server (e.g. musk serves from :8080). This tiny server lets the example run
// standalone for testing the Plan 003 remote-component protocol.
//
// CORS is permissive because auto-os-config loads the bundle cross-origin via
// dynamic import(). In production you'd scope this to the config center origin.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const PORT = 17720
const DIST = join(import.meta.dirname, 'dist')

const MIME = { '.js': 'text/javascript', '.json': 'application/json' }

createServer(async (req, res) => {
  // CORS: allow the config center to import() this bundle cross-origin.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let path = url.pathname
  if (path === '/') path = '/config-page.js'
  try {
    const body = await readFile(join(DIST, path))
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`example remote module serving dist/ on http://127.0.0.1:${PORT}`)
})
