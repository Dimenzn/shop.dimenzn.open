import { startTimeWarp } from './src-server/utils/time-hijacker.js'

import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import serveStatic from 'serve-static'
import history from 'connect-history-api-fallback'

// --- Local Modules ---
import { getEnvPath } from './src-server/utils/getEnvPath.js'
import { connectDB } from './src-server/config/dbConfig.js'
import { initMailService } from './src-server/services/mail.service.js'
import authRoutes from './src-server/routes/authRoutes.js'
import openRoutes from './src-server/routes/openRoutes.js'
import { stripeWebhook } from './src-server/controllers/paymentController.js'
import { initBillingCron } from './src-server/services/billing.service.js'
import { initTrustScoreCron } from './src-server/services/trustScore.service.js'
import { initCleanupCloudCron } from './src-server/services/cleanupCloud.service.js'

// 1. Load Global Config (Common to all, ALWAYS .env)
const globalEnvPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: globalEnvPath, override: true })
console.log(`🌍 [System] Global layer applied: ${globalEnvPath}`)

// 2. Load Market Config (Specific to this instance)
import fs from 'fs'
const marketEnvPath = getEnvPath() // 👈 Smart utility now cleanly returns .env.test, .env.rs, etc.

if (fs.existsSync(marketEnvPath)) {
  dotenv.config({ path: marketEnvPath, override: true })
  console.log(`📡 [System] Market layer applied: ${marketEnvPath}`)
} else {
  console.warn(`⚠️ [System] Market layer not found: ${marketEnvPath}`)
}

console.log(`🚀 [Server] Initialized as ${process.env.MARKET_ENV || 'test'}`)

// --- Environment Setup ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const port = process.env.PORT || 5000

const app = express()

// 🌟 CRITICAL: The Webhook route MUST come before express.json()
// We use express.raw() so Stripe can verify the exact byte signature
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

// --- Middleware: Body Parsing ---
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// --- Middleware: CORS ---
// 'origin: true' reflects the request origin back, allowing any device
// (phone, tablet, laptop) on the local network to connect. Ideal for dev/testing.
const corsOptions = {
  origin: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// --- Database Initialization ---
if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'ConnectionString') {
  connectDB()
    .then(() => {
      // 1. Database is connected successfully.

      // 2. Engage the hyperdrive!
      // (This hijacks the global clock before anything else can use it)
      startTimeWarp()

      // 3. Start the autonomous engines!
      // Because they start after the warp is engaged, node-cron
      // is forced to use the artificially sped-up clock.
      initBillingCron()
      initTrustScoreCron()
      initCleanupCloudCron()

      console.log('🤖 [System] All autonomous engines running.')
    })
    .catch(err => {
      console.error('❌ [DB] Failed to initialize startup sequence:', err)
    })
} else {
  console.warn('⚠️ [DB] Server started in INSTALLER MODE (Waiting for setup)')
}

// --- Middleware: Gatekeeper ---
// Protects API routes if the database is not ready or configured.
app.use((req, res, next) => {
  // 1. Always allow the installation route and frontend assets to pass
  if (req.path === '/api/open/install/system' || !req.path.startsWith('/api')) {
    return next()
  }

  // 2. Block API requests if the database is disconnected
  if (mongoose.connection.readyState !== 1) {
    // SCENARIO A: Fresh Install (Triggers installMode = true on frontend)
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI === 'ConnectionString') {
      return res.status(503).json({
        code: 'SETUP_REQUIRED',
        message: 'System needs installation'
      })
    }

    // SCENARIO B: Database Outage / IP Blocked (Triggers isOffline = true on frontend)
    return res.status(500).json({
      code: 'DATABASE_OFFLINE',
      message: 'Database is temporarily offline or unreachable'
    })
  }

  next()
})

// --- API Routes ---
app.use('/api/auth', authRoutes)
app.use('/api/open', openRoutes)

// --- Frontend Serving (SPA) ---
// history() ensures Vue Router handles client-side routing properly (prevents 404s on refresh)
app.use(history())
app.use(serveStatic(path.join(__dirname, 'dist/spa')))

// --- Server Startup Sequence ---
const startServer = async () => {
  try {
    // 1. Initialize supporting services
    await initMailService()
    console.log('✅ [Service] Mail service initialized successfully')

    // 2. Bind to 0.0.0.0 to listen on the Public Network Interface
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 [Server] Running at http://0.0.0.0:${port}`)
      console.log(`🌐 [Server] Accessible on your local network`)
    })
  } catch (error) {
    console.error('❌ [Server] Failed to start:', error)
    process.exit(1) // Exit process if critical services fail to load
  }
}

startServer()
