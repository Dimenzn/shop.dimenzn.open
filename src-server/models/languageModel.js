import mongoose from 'mongoose'

// ==========================================
// 🌐 LANGUAGE & I18N MODEL
// ==========================================
/**
 * Schema for managing available languages and their translations.
 * This model drives the localization engine on both the frontend and backend.
 */
const languageSchema = new mongoose.Schema({
  // ISO Code or identifier (e.g., 'en-US', 'sr-RS')
  value: {
    type: String,
    required: true,
    unique: true
  },

  // Display name in the language selector (e.g., 'English', 'Srpski')
  label: {
    type: String,
    required: true
  },

  // Emoji flag or shorthand code
  flag: {
    type: String,
    required: true
  },

  // URL or path to a higher-quality flag icon/image
  flagImage: {
    type: String,
    required: true
  },

  // Determines if this language is visible to customers
  active: {
    type: Boolean,
    default: false
  },

  // System flag: indicates if this is the currently selected default for the shop
  selected: {
    type: Boolean,
    default: false
  },

  // The master dictionary containing all translation keys and their values
  // Example: { "NAV_HOME": "Home", "BTN_BUY": "Buy Now" }
  i18n: {
    type: Object,
    default: {}
  }
})

export default mongoose.model('Language', languageSchema)
