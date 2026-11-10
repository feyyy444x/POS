export function adaptRequestHandler(handler) {
  return async function vercelRequestHandler(req, res) {
    try {
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers || {})) {
        if (value === undefined) continue
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
      }

      const method = String(req.method || 'GET').toUpperCase()
      let body
      if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
        body = typeof req.body === 'string' || req.body instanceof Uint8Array
          ? req.body
          : JSON.stringify(req.body)
      }

      const host = req.headers?.host || 'localhost'
      const request = new Request(new URL(req.url || '/', `https://${host}`), {
        method,
        headers,
        ...(body === undefined ? {} : { body }),
      })
      const response = await handler(request)
      res.statusCode = response.status
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-length') res.setHeader(key, value)
      })
      if (response.status === 204 || response.status === 304) return res.end()
      return res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      console.error('acoPos API adapter error:', error)
      return res.status(500).json({ error: 'Terjadi kesalahan pada layanan aplikasi.' })
    }
  }
}
