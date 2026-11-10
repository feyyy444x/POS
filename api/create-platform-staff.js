import handler from '../netlify/functions/create-platform-staff.mjs'
import { adaptNetlifyRequestHandler } from '../lib/vercel-netlify-adapter.js'
export default adaptNetlifyRequestHandler(handler)
