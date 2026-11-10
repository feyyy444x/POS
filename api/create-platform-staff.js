import handler from '../netlify/functions/create-platform-staff.mjs'
import { adaptRequestHandler } from '../lib/vercel-request-adapter.js'
export default adaptRequestHandler(handler)
