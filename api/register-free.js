import handler from '../netlify/functions/register-free.mjs'
import { adaptNetlifyRequestHandler } from '../lib/vercel-netlify-adapter.js'
export default adaptNetlifyRequestHandler(handler)
