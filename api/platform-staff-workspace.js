import handler from '../netlify/functions/platform-staff-workspace.mjs'
import { adaptRequestHandler } from '../lib/vercel-request-adapter.js'
export default adaptRequestHandler(handler)
