import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { validationResult } from 'express-validator'

// --- Models ---
import User from '../models/userModel.js'
import Ui from '../models/uiModel.js'
import Language from '../models/languageModel.js'

// --- Services & Utils ---
import { sendEmail } from '../services/mail.service.js'
import { getWelcomeTemplate, getResetPasswordTemplate } from '../utils/emailTemplates.js'
import { generateAccessToken, generateRefreshToken } from '../middlewares/authMiddleware.js'

// ==========================================
// 📝 REGISTER USER
// ==========================================
export const registerUser = async (req, res) => {
  try {
    const { email, password, locale = 'en-US' } = req.body

    // 1. Validation Check
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array()[0].msg
      return res.status(400).json({ message: errorMessages })
    }

    // 2. Check Existing User
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'AUTH_USER_EXISTS' })
    }

    // 3. Determine Role & Status
    // If this is the very first user in the DB, make them an active Admin automatically.
    const firstUser = await User.findOne({})
    let role = 'member'
    let isActive = false

    if (!firstUser) {
      role = 'admin'
      isActive = true
      console.log('👑 [Auth] First user registered. Assigning Admin role.')
    }

    const activationToken = crypto.randomBytes(32).toString('hex')

    // 4. Create and Save User
    const user = new User({ email, password, role, isActive, activationToken })
    await user.save()

    // 5. Generate Tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken
    const registration = await user.save()

    // --- 📧 EMAIL LOGIC (Members Only) ---
    if (role !== 'admin') {
      const userEmailName = registration.email.split('@')[0]
      const uiSettings = await Ui.findOne({})
      const companyName = uiSettings?.companyName || 'Web-Shop'

      let langDoc = await Language.findOne({ value: locale })
      if (!langDoc) langDoc = await Language.findOne({ value: 'en-US' })

      const t = langDoc?.i18n?.eWelcome
      const activationLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/activate?token=${activationToken}&lang=${langDoc.value}`

      sendEmail({
        to: email,
        subject: `${t.WELCOME_SUBJECT} ${companyName}!`,
        html: getWelcomeTemplate(userEmailName, companyName, activationLink, t)
      })
      console.log(`📧 [Email] Activation email sent to: ${email}`)
    }

    // 6. Response Handling
    // Admins skip the email check and log in instantly
    if (user.role === 'admin') {
      return res.status(201).json({
        _id: user.id,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken
      })
    }

    // Standard members must check their inbox
    res.status(201).json({ message: 'REG_CONFIRM' })
  } catch (error) {
    console.error('❌ [Auth] AUTH_REGISTER_ERR:', error)
    res.status(500).json({ message: 'AUTH_REGISTER_ERR' })
  }
}

// ==========================================
// 🔑 LOGIN USER
// ==========================================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    // 1. Validation Check
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const errorMessages = errors.array()[0].msg
      return res.status(400).json({ message: errorMessages })
    }

    // 2. Locate User
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'AUTH_INVALID_CREDS' })
    }

    // 3. Verify Account is Active (Email clicked)
    if (!user.isActive) {
      console.warn(`⚠️ [Auth] Login denied. Account inactive: ${email}`)
      return res.status(403).json({ message: 'LOG_DENIDE' })
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'AUTH_INVALID_CREDS' })
    }

    // 5. Issue Tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    user.refreshToken = refreshToken
    await user.save()

    console.log(`✅ [Auth] Successful login: ${email}`)
    res.json({
      _id: user.id,
      email: user.email,
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('❌ [Auth] AUTH_LOGIN_ERR:', error)
    res.status(500).json({ message: 'AUTH_LOGIN_ERR' })
  }
}

// ==========================================
// 🚪 LOGOUT USER
// ==========================================
export const logoutUser = async (req, res) => {
  try {
    const { refreshToken, admin } = req.body

    if (!refreshToken) {
      return res.status(400).json({ message: 'AUTH_REFRESH_REQ' })
    }

    // Find user by their active refresh token and wipe it
    const user = await User.findOne({ refreshToken })
    if (user) {
      user.refreshToken = null
      await user.save()
      console.log(`🚪 [Auth] User logged out: ${user.email}`)
    }

    // If this request came from the Admin Panel, return null to wipe the store silently
    if (admin) {
      return res.status(200).json(null)
    }

    res.status(200).json({ message: 'AUTH_LOGOUT_SUCCESS' })
  } catch (error) {
    console.error('❌ [Auth] Logout error:', error)
    res.status(500).json({ message: 'AUTH_LOGOUT_ERR' })
  }
}

// ==========================================
// ✅ ACTIVATE ACCOUNT
// ==========================================
export const activateAccount = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findOne({ activationToken: token })

    if (!user) {
      console.warn('⚠️ [Auth] Activation failed. Token invalid or expired.')
      return res.status(400).json({ message: 'REG_EXPIRED' })
    }

    // Activate and clear the one-time token
    user.isActive = true
    user.activationToken = undefined
    await user.save()

    console.log(`✅ [Auth] Account activated successfully: ${user.email}`)
    res.status(200).json({ message: 'REG_APROVED' })
  } catch (error) {
    console.error('❌ [Auth] AUTH_ACTIVATE_ERR:', error)
    res.status(500).json({ message: 'REG_FAILED' })
  }
}

// ==========================================
// 🔄 RESEND VERIFICATION EMAIL
// ==========================================
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email, locale = 'en-US' } = req.body
    const user = await User.findOne({ email })

    // Security Practice: Return success even if user doesn't exist (Anti-Enumeration)
    if (!user) return res.status(200).json({ message: 'EMAIL_RESENT' })

    if (user.isActive) {
      return res.status(400).json({ message: 'USER_ALREADY_ACTIVE' })
    }

    // Invalidate old token and create a fresh one
    const newActivationToken = crypto.randomBytes(32).toString('hex')
    user.activationToken = newActivationToken
    await user.save()

    // --- 📧 EMAIL LOGIC ---
    const userEmailName = user.email.split('@')[0]
    const uiSettings = await Ui.findOne({})
    const companyName = uiSettings?.companyName || 'Web-Shop'

    let langDoc = await Language.findOne({ value: locale })
    if (!langDoc) langDoc = await Language.findOne({ value: 'en-US' })

    const t = langDoc?.i18n?.eWelcome
    const activationLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/activate?token=${newActivationToken}&lang=${langDoc.value}`

    sendEmail({
      to: user.email,
      subject: `${t.WELCOME_SUBJECT} ${companyName}!`,
      html: getWelcomeTemplate(userEmailName, companyName, activationLink, t)
    })

    console.log(`📧 [Email] Re-sent activation email to: ${user.email}`)
    res.status(200).json({ message: 'EMAIL_RESENT' })
  } catch (error) {
    console.error('❌ [Auth] AUTH_RESEND_ERR:', error)
    res.status(500).json({ message: 'AUTH_RESEND_ERR' })
  }
}

// ==========================================
// ❓ FORGOT PASSWORD
// ==========================================
export const forgotPassword = async (req, res) => {
  try {
    const { email, locale = 'en-US' } = req.body
    const user = await User.findOne({ email })

    // Security Practice: Anti-enumeration. Always confirm sending.
    if (!user) return res.status(200).json({ message: 'PASS_RESET_SENT' })

    // Generate secure token with a 1-Hour expiration
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = Date.now() + 3600000 // +1 Hour
    await user.save()

    // --- 📧 EMAIL LOGIC ---
    const userEmailName = user.email.split('@')[0]
    const uiSettings = await Ui.findOne({})
    const companyName = uiSettings?.companyName || 'Web-Shop'

    let langDoc = await Language.findOne({ value: locale })
    if (!langDoc) langDoc = await Language.findOne({ value: 'en-US' })

    const t = langDoc?.i18n?.eResetPass
    const resetLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/reset-password?token=${resetToken}&lang=${langDoc.value}`

    sendEmail({
      to: user.email,
      subject: `${t.RESET_SUBJECT} - ${companyName}`,
      html: getResetPasswordTemplate(userEmailName, companyName, resetLink, t)
    })

    console.log(`📧 [Email] Password reset link sent to: ${user.email}`)
    res.status(200).json({ message: 'PASS_RESET_SENT' })
  } catch (error) {
    console.error('❌ [Auth] AUTH_FORGOT_PASS_ERR:', error)
    res.status(500).json({ message: 'AUTH_FORGOT_PASS_ERR' })
  }
}

// ==========================================
// 🔒 RESET PASSWORD
// ==========================================
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Ensure token is not expired
    })

    if (!user) {
      console.warn('⚠️ [Auth] Password reset failed. Token expired or invalid.')
      return res.status(400).json({ message: 'PASS_RESET_EXPIRED' })
    }

    // Mongoose pre-save hook handles hashing the new password automatically
    user.password = newPassword

    // Clear the token data to prevent reuse
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    console.log(`✅ [Auth] Password successfully reset for: ${user.email}`)
    res.status(200).json({ message: 'PASS_RESET_SUCCESS' })
  } catch (error) {
    console.error('❌ [Auth] AUTH_RESET_ERR:', error)
    res.status(500).json({ message: 'AUTH_RESET_ERR' })
  }
}
