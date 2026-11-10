import handler from '../netlify/functions/register-free.mjs'
import { adaptRequestHandler } from '../lib/vercel-request-adapter.js'
export default adaptRequestHandler(handler)
