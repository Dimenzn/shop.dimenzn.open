import cron from 'node-cron'
import UI from '../models/uiModel.js'
import { processBatchBilling } from '../controllers/paymentController.js'

// We store the task globally so we can stop/restart it if the admin changes the timezone!
let billingTask = null

export const initBillingCron = async () => {
  try {
    // 1. Fetch the timezone from the database before starting the clock
    const settings = await UI.findOne({})
    const timezone = settings?.platformTimezone || 'UTC'

    // 2. If a cron job is already running, kill it so we can restart it with new settings
    if (billingTask) {
      billingTask.stop()
    }

    // 3. Start the Cron Job
    billingTask = cron.schedule(
      '0 0 * * *',
      async () => {
        console.log(`⏰ [Cron] Waking up at Midnight (${timezone})...`)

        const currentSettings = await UI.findOne({})
        if (!currentSettings?.autoBillingEnabled) {
          console.log('💤 [Cron] Auto-billing disabled. Sleeping.')
          return
        }

        const today = new Date().toLocaleString('en-US', { timeZone: timezone, day: 'numeric' })

        // Check if today matches the billing day
        if (parseInt(today) === currentSettings.autoBillingDay) {
          console.log(`🚀 [Cron] Executing Batch Billing!`)
          await processBatchBilling()
        } else {
          console.log(`🗓️ [Cron] Not billing day. Skipping.`)
        }
      },
      {
        scheduled: true,
        timezone: timezone // 🌟 Dynamically injected from your database!
      }
    )

    console.log(`✅ [System] Billing Cron initialized in timezone: ${timezone}`)
  } catch (error) {
    console.error('❌ [Cron] Failed to initialize cron job:', error)
  }
}
