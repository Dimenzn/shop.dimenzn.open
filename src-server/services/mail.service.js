import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import Ui from '../models/uiModel.js'

let resendClient = null
let devTransporter = null

// ==========================================
// ⚙️ INITIALIZE MAIL SERVICE
// ==========================================
export const initMailService = async () => {
  try {
    // --------------------------------------------------
    // 1. DEV MODE: Generate Ethereal Test Account
    // --------------------------------------------------
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ [Mail] No Resend API Key found. Creating Ethereal test account...')

      try {
        const testAccount = await nodemailer.createTestAccount()
        devTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        })

        console.log('✅ [Mail] Ethereal Test Account Ready.')
        console.log(`🌐 [Mail] Login: https://ethereal.email/login | User: ${testAccount.user}`)
      } catch (err) {
        console.error('❌ [Mail] Failed to create Ethereal account.', err.message)
      }
    }
    // --------------------------------------------------
    // 2. PROD MODE: Use Resend API
    // --------------------------------------------------
    else {
      resendClient = new Resend(process.env.RESEND_API_KEY)
      console.log('✅ [Mail] Connected to Enterprise Resend API.')
    }
  } catch (error) {
    console.error('❌ [Mail] Initialization Failed:', error.message)
  }
}

// ==========================================
// 📤 SEND EMAIL HELPER
// ==========================================
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const uiSettings = await Ui.findOne({})
    const companyName = uiSettings?.companyName || 'Dimenzn'

    // 🛡️ The Magic: You can now use any prefix you want here because your domain is verified!
    const fromAddress = `${companyName} <team@dimenzn.com>`

    // --- PROD: SEND VIA RESEND ---
    if (resendClient) {
      const { data, error } = await resendClient.emails.send({
        from: fromAddress,
        to: to,
        reply_to: 'dimenzn.support@gmail.com',
        subject: subject,
        html: html
      })

      if (error) {
        console.error('❌ [Resend] API Error:', error.message)
        return false
      }

      console.log(`📧 [Mail] Sent successfully via Resend (ID: ${data.id}) to ${to}`)
      return true
    }
    // --- DEV: SEND VIA ETHEREAL ---
    else if (devTransporter) {
      const info = await devTransporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html
      })
      console.log(`👀 [Mail] DEV PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`)
      return true
    } else {
      console.warn('⚠️ [Mail] No mail service configured. Skipping dispatch.')
      return false
    }
  } catch (error) {
    console.error('❌ [Mail] Critical Send Error:', error.message)
    return false
  }
}
