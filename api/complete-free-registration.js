import handler from '../netlify/functions/complete-free-registration.mjs'
import { adaptRequestHandler } from '../lib/vercel-request-adapter.js'
export default adaptRequestHandler(handler)
