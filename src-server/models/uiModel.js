import mongoose from 'mongoose'

// ==========================================
// 🎨 UI & GLOBAL CONFIGURATION MODEL
// ==========================================
/**
 * Schema for managing global application state and store settings.
 * This model controls the branding, checkout rules, and localized display
 * across the entire storefront and admin panel.
 */
const uiSchema = new mongoose.Schema({
  // --- Branding & Identity ---
  companyName: {
    type: String,
    default: 'Company Name'
  },
  urlImageCompanyLogo: {
    type: String,
    default: ''
  },

  // --- Social & Contact Links ---
  // Stored as nested objects to keep the UI store clean and manageable
  email: {
    show: { type: Boolean, default: true },
    url: { type: String, default: 'team@dimenzn.com' } // Used for mailto:
  },
  whatsapp: {
    show: { type: Boolean, default: false },
    url: { type: String, default: 'https://whatsapp.com' }
  },
  x: {
    show: { type: Boolean, default: false },
    url: { type: String, default: 'https://x.com' }
  },
  instagram: {
    show: { type: Boolean, default: false },
    url: { type: String, default: 'https://instagram.com' }
  },
  facebook: {
    show: { type: Boolean, default: false },
    url: { type: String, default: 'https://facebook.com' }
  },
  tiktok: {
    show: { type: Boolean, default: false },
    url: { type: String, default: 'https://tiktok.com' }
  },
  youtube: {
    show: { type: Boolean, default: false },
    url: { type: String, default: 'https://youtube.com' }
  },

  // --- Layout & Component States ---
  leftDrawerOpen: {
    type: Boolean,
    default: false // Controls the initial state of the side navigation
  },
  langBar: {
    type: Boolean,
    default: true // Toggles the visibility of the language selector
  },
  showInfoPage: {
    type: Boolean,
    default: true // Shows the info page button by default
  },

  // --- Payment Methods (Toggles) ---
  paymentCod: {
    type: Boolean,
    default: false // Cash on Delivery
  },
  paymentCia: {
    type: Boolean,
    default: false // Cash in Advance / Wire Transfer
  },
  paymentPoa: {
    type: Boolean,
    default: false // Payment on Account / Invoice
  },

  // --- Sellers Auto Billing Control --
  autoBillingEnabled: {
    type: Boolean,
    default: false
  },
  autoBillingDay: {
    type: Number,
    default: 1,
    min: 1,
    max: 28 // Capped at 28 to prevent bugs in February!
  },

  // 🌟 TRUST SCORE ENGINE & SLAs
  slaConfirmHours: { type: Number, default: 24 },
  slaShipHours: { type: Number, default: 48 },
  stagnantDays: { type: Number, default: 7 },

  // Game Rewards
  scoreConfirmBonus: { type: Number, default: 2 },
  scoreShipBonus: { type: Number, default: 3 },
  scoreDeliveryBase: { type: Number, default: 10 },

  // Game Penalties
  scoreCancelPenalty: { type: Number, default: 40 },
  scoreRestockPenalty: { type: Number, default: 15 },
  stagnantPenalty: { type: Number, default: 10 },

  // --- Commerce & Pricing ---

  // 🌟 NEW: Platform Service Fee Controls
  platformFeeType: {
    type: String,
    enum: ['percentage', 'flat'],
    default: 'percentage'
  },
  platformFeePercentage: {
    type: Number,
    default: 5 // Represents 5%
  },
  platformFeeFlat: {
    type: Number,
    default: 50 // Represents 50 units of your currency (e.g., 50 RSD)
  },

  shippingCost: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  currencyOptions: {
    type: Array,
    default: [] // Array of supported currency strings
  },

  // --- Regional & Checkout Rules ---
  showCountry: {
    type: Boolean,
    default: false // If true, requires the user to select a country at checkout
  },
  allowedCountries: {
    type: [String], // Array of country names allowed for shipping
    default: ['United States']
  },
  defaultCountry: {
    type: String,
    default: 'United States'
  },
  platformTimezone: {
    type: String,
    default: 'UTC'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('UI', uiSchema)
