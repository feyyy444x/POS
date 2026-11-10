import handler from '../netlify/functions/activate-invitation.mjs'
import { adaptRequestHandler } from '../lib/vercel-request-adapter.js'
export default adaptRequestHandler(handler)
