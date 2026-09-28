import mongoose from 'mongoose'
import 'dotenv/config'

// ==========================================
// 🗄️ DATABASE CONNECTION & RECOVERY
// ==========================================
/**
 * Initializes the MongoDB connection.
 * Features an auto-retry loop if the database is offline at startup,
 * and event listeners for runtime disconnects/reconnects.
 * Skips connection entirely if the system is in Installer Mode.
 */
export const connectDB = async () => {
  // --------------------------------------------------
  // 1. INSTALLER MODE CHECK
  // --------------------------------------------------
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === 'ConnectionString') {
    console.warn('⚠️ [DB] Connection skipped. Server starting in INSTALLER MODE.')
    return
  }

  // --------------------------------------------------
  // 2. RUNTIME EVENT LISTENERS
  // --------------------------------------------------
  // Ensure we don't attach duplicate listeners on hot reloads
  if (mongoose.connection.listeners('disconnected').length === 0) {
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [DB] Connection lost! Waiting for auto-reconnect...')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('✅ [DB] Reconnected successfully!')
    })

    mongoose.connection.on('error', err => {
      console.error(`❌ [DB] Runtime connection error: ${err.message}`)
    })
  }

  // --------------------------------------------------
  // 3. INITIAL CONNECTION AUTO-RETRY LOOP
  // --------------------------------------------------
  const connectWithRetry = async () => {
    try {
      // If Mongoose is already connected (1) or connecting (2), do not spam it
      if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        return
      }

      console.log('⏳ [DB] Attempting to connect to MongoDB...')

      await mongoose.connect(process.env.MONGODB_URI)

      console.log('✅ [DB] Connected successfully!')
    } catch (error) {
      console.error(`❌ [DB] Connection failed: ${error.message}`)
      console.log('🔄 [DB] Database offline. Retrying in 5 seconds (Server remains active)...')

      // Call this exact function again after a 5-second delay
      setTimeout(connectWithRetry, 5000)
    }
  }

  // --------------------------------------------------
  // 4. EXECUTE CONNECTION
  // --------------------------------------------------
  await connectWithRetry()
}
