import handler from '../netlify/functions/manage-user-password.mjs'
import { adaptRequestHandler } from '../lib/vercel-request-adapter.js'
export default adaptRequestHandler(handler)
