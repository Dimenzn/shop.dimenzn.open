import UI from '../models/uiModel.js'
import { updateEnvVariables } from '../utils/envHelper.js'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'

/**
 * GET UI Settings
 * Handles the initial bootstrap and Installer Mode.
 */
export const getUI = async (req, res) => {
  try {
    // 1. Installer Mode Check: If URI is default, return empty to let frontend load Installer
    if (process.env.MONGODB_URI === 'ConnectionString') {
      return res.status(200).json([]) // Always use status codes for clarity
    }

    const ui = await UI.find()

    // 2. Data Check: Return empty array instead of 404 to prevent frontend crashes
    if (!ui || ui.length === 0) {
      return res.status(200).json([])
    }

    res.status(200).json(ui)
  } catch (error) {
    console.error('❌ [UI] Fetch error:', error)
    res.status(500).json({ message: 'UI_FETCH_ERR' })
  }
}

/**
 * SAVE UI & Environment Settings
 * Handles the "Connect & Setup" logic and triggers server restart.
 */
export const saveDataUI = async (req, res) => {
  try {
    const { uiData, envPayload } = req.body
    let needsRestart = false

    // 1. Update .env Variables
    if (envPayload && Object.keys(envPayload).length > 0) {
      // 🛡️ Security Check: Test new MongoDB URI before writing
      if (envPayload.MONGODB_URI && envPayload.MONGODB_URI !== process.env.MONGODB_URI) {
        try {
          console.log('🔌 [Env] Testing new MongoDB URI...')
          const testConn = await mongoose.createConnection(envPayload.MONGODB_URI).asPromise()
          await testConn.close()
          console.log('✅ [Env] New MongoDB URI is valid!')
        } catch (err) {
          console.error('❌ [Env] Invalid MongoDB URI:', err.message)
          return res.status(400).json({ message: 'Could not connect to the new database.' })
        }
      }

      const isEnvUpdated = updateEnvVariables(envPayload)
      if (!isEnvUpdated) {
        return res.status(500).json({ message: 'ENV_UPDATE_FAILED' })
      }

      needsRestart = true // Signal that a restart is required for changes to take effect
    }

    // 2. Update MongoDB UI Settings
    if (uiData) {
      await UI.deleteMany({})
      const dataToInsert = Array.isArray(uiData) ? uiData : [uiData]
      await UI.insertMany(dataToInsert)
    }

    // 3. Success Response: Send BEFORE the process terminates
    res.status(200).json({
      message: 'DATA_SAVE_SUCCESS',
      restarting: needsRestart
    })

    // 4. Smart Restart Logic
    if (needsRestart) {
      setTimeout(() => {
        const triggerFile = path.resolve(process.cwd(), 'server.js')
        const isDev = process.env.NODE_ENV === 'development'

        if (isDev) {
          console.log('🔁 [System] Touching server.js for Nodemon restart...')
          if (fs.existsSync(triggerFile)) {
            const now = new Date()
            fs.utimesSync(triggerFile, now, now)
          }
        } else {
          console.log('💀 [System] Exiting process for PM2/Docker restart...')
          process.exit(1) // Standard for containerized/PM2 environments
        }
      }, 1000)
    }
  } catch (error) {
    // FIX: Using the error variable here prevents the ESLint build-block
    console.error('❌ [UI] saveData error:', error.message)
    res.status(500).json({ message: 'DATA_SAVE_ERR' })
  }
}
