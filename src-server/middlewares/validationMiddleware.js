import { body, validationResult } from 'express-validator'
import User from '../models/userModel.js'

// ==========================================
// 🛠️ SHARED ERROR HANDLER
// ==========================================
/**
 * Intercepts the request after express-validator rules run.
 * If errors exist, it blocks the request and sends the first error's i18n key to the frontend.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessage = errors.array()[0].msg
    console.warn(`⚠️ [Validation] Request blocked: ${errorMessage}`)
    return res.status(400).json({ message: errorMessage })
  }
  next()
}

// ==========================================
// 📝 REGISTRATION VALIDATION
// ==========================================
export const validateRegistration = [
  // 1. Email Format & Normalization
  body('email')
    .notEmpty()
    .withMessage('VAL_EMAIL_REQ')
    .isEmail()
    .withMessage('VAL_EMAIL_INVALID')
    .normalizeEmail({
      gmail_remove_dots: false, // Preserve dots in Gmail addresses
      gmail_convert_googlemailcom: true // Convert @googlemail.com to @gmail.com
    }),

  // 2. Email Uniqueness Check
  body('email').custom(async value => {
    const user = await User.findOne({ email: value })
    if (user) {
      throw new Error('VAL_EMAIL_IN_USE')
    }
  }),

  // 3. Password Rules
  body('password')
    .notEmpty()
    .withMessage('VAL_PASS_REQ')
    .isLength({ min: 6 })
    .withMessage('VAL_PASS_LENGTH'),

  // 4. Handle Result
  handleValidationErrors
]

// ==========================================
// 🔑 LOGIN VALIDATION
// ==========================================
export const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('VAL_EMAIL_REQ')
    .isEmail()
    .withMessage('VAL_EMAIL_INVALID')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password').notEmpty().withMessage('VAL_PASS_REQ'),

  handleValidationErrors
]

// ==========================================
// ❓ FORGOT PASSWORD VALIDATION
// ==========================================
export const validateForgotPassword = [
  body('email')
    .notEmpty()
    .withMessage('VAL_EMAIL_REQ')
    .isEmail()
    .withMessage('VAL_EMAIL_INVALID')
    .normalizeEmail({ gmail_remove_dots: false }),

  handleValidationErrors
]

// ==========================================
// 🔒 RESET PASSWORD VALIDATION
// ==========================================
export const validateResetPassword = [
  body('token').notEmpty().withMessage('INVALID_TOKEN'),

  body('newPassword')
    .notEmpty()
    .withMessage('VAL_PASS_REQ')
    .isLength({ min: 6 })
    .withMessage('VAL_PASS_LENGTH'), // Mapped to existing dictionary key

  handleValidationErrors
]
