import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// ==========================================
// 👤 USER & AUTHENTICATION MODEL
// ==========================================
/**
 * Schema for system users.
 * Handles authentication credentials, role-based access,
 * account activation, and personal profile/shipping details.
 */
const userSchema = new mongoose.Schema(
  {
    // --- Account Status & Security ---
    locale: {
      type: String,
      default: 'en-US'
    },
    isActive: {
      type: Boolean,
      default: false // Set to true after email verification (except for the first admin)
    },
    activationToken: {
      type: String
    },
    role: {
      type: String,
      enum: ['member', 'seller', 'admin', 'platform'],
      default: 'member'
    },
    storeProfile: {
      accountStatus: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
      },
      billingStatus: {
        type: String,
        enum: ['active', 'warning', 'restricted'],
        default: 'active'
      },
      billingLockReason: {
        type: String,
        default: ''
      },
      // 🌟 NEW: Tracks if they have basic or premium storefront features
      sellerTier: {
        type: String,
        enum: ['starter', 'pro', 'platform'],
        default: 'starter'
      },
      // 🌟 NEW: For billing the seller their COD fees at the end of the month
      stripeCustomerId: {
        type: String,
        default: null
      },
      // 🌟 NEW: The Elo Rating System
      trustScore: {
        type: Number,
        default: 1500,
        min: 0,
        max: 5000
      },
      storeName: {
        type: String,
        trim: true,
        default: function () {
          // Generates a random 4-digit number (e.g., 4928)
          const randomSuffix = Math.floor(1000 + Math.random() * 9000)
          return `ROCKY #${randomSuffix}`
        }
      },
      storeDescription: {
        type: String,
        trim: true
      },
      storeLogo: {
        type: String,
        default: null
      },
      storeBanner: {
        type: String,
        default: null
      },
      shipping: {
        isFree: {
          type: Boolean,
          default: false
        },
        flatRate: {
          type: Number,
          default: 0
        }
      },
      socials: {
        email: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        whatsapp: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        viber: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        instagram: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        facebook: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        x: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        tiktok: { url: { type: String, default: '' }, show: { type: Boolean, default: false } },
        youtube: { url: { type: String, default: '' }, show: { type: Boolean, default: false } }
      },
      // 🌟 NEW: How the seller wants to receive their money from online payments
      payoutSettings: {
        method: {
          type: String,
          enum: ['bank_local', 'bank_iban', 'paypal', 'payoneer'],
          default: 'bank_local'
        },
        accountName: { type: String, default: '' },
        accountNumber: { type: String, default: '' }, // For Serbian Tekući Račun
        iban: { type: String, default: '' },
        swift: { type: String, default: '' },
        email: { type: String, default: '' } // For PayPal/Payoneer
      },
      // How much the marketplace owes them (Admin holds the money from Stripe)
      pendingBalance: {
        type: Number,
        default: 0
      },
      totalEarned: {
        type: Number,
        default: 0
      },
      // 🌟 NEW: How much the seller owes the marketplace (from COD fees)
      platformFeesOwed: {
        type: Number,
        default: 0
      }
    },
    // --- Credentials ---
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },

    // --- Password Recovery ---
    resetPasswordToken: {
      type: String,
      required: false
    },
    resetPasswordExpires: {
      type: Date,
      required: false
    },

    // --- Profile Details ---
    firstName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },

    shippingAddress: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' }
    },

    // --- Session Management ---
    refreshToken: {
      type: String
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true // Adds and manages 'updatedAt'
  }
)

// ==========================================
// 🔄 MIDDLEWARE (Pre-Save)
// ==========================================
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  try {
    console.log(`🔄 [User] Pre-save: Hashing password for ${this.email}...`)
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    console.log(`✅ [User] Pre-save: Password hashed successfully.`)
  } catch (error) {
    console.error('❌ [User] Hashing failed:', error.message)
    throw new Error('AUTH_HASH_ERR')
  }
})

export default mongoose.model('User', userSchema)
