import handler from '../netlify/functions/activate-invitation.mjs'
import { adaptNetlifyRequestHandler } from '../lib/vercel-netlify-adapter.js'
export default adaptNetlifyRequestHandler(handler)
