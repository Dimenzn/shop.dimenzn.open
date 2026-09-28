import cron from 'node-cron'
import UI from '../models/uiModel.js'
import { runCloudinaryCleanup } from '../utils/cloudinaryCleanup.js'

export const initCleanupCloudCron = () => {
  // Run every night at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      const uiSettings = await UI.findOne()

      // Only run if the Admin flipped the toggle in SetupPanel!
      if (uiSettings && uiSettings.autoCloudCleanup) {
        await runCloudinaryCleanup()
      }
    } catch (err) {
      console.error('Cron Cloudinary Cleanup Error:', err)
    }
  })
}
