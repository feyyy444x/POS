import handler from '../netlify/functions/manage-store-member-password.mjs'
import { adaptNetlifyRequestHandler } from '../lib/vercel-netlify-adapter.js'
export default adaptNetlifyRequestHandler(handler)
