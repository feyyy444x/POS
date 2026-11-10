import handler from '../netlify/functions/platform-staff-workspace.mjs'
import { adaptNetlifyRequestHandler } from '../lib/vercel-netlify-adapter.js'
export default adaptNetlifyRequestHandler(handler)
