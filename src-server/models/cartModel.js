import mongoose from 'mongoose'

// ==========================================
// 🛒 CART ITEM SCHEMA
// ==========================================
/**
 * Sub-schema for individual products inside a cart.
 */
const cartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: false // Optional: Not all products have size variations
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  }
})

// ==========================================
// 🛒 MAIN CART SCHEMA
// ==========================================
/**
 * Defines the shopping cart structure.
 * Supports both Authenticated Users (userId exists) and Guest Users (userId is null).
 */
const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: null // Explicitly default to null for guest carts
  },
  items: [cartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// ==========================================
// 🔄 MIDDLEWARE
// ==========================================
/**
 * Automatically updates the 'updatedAt' timestamp every time the cart is modified.
 * Crucial for the TTL index (auto-deletion) to evaluate inactivity correctly.
 */
cartSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

// ==========================================
// ⚡ INDEXES
// ==========================================

/**
 * 1. UNIQUE USER INDEX (Partial)
 * Ensures an authenticated user can only have ONE active cart at a time.
 * The partial filter allows infinite Guest Carts (where userId is null).
 */
cartSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $ne: null } }
  }
)

/**
 * 2. TTL (TIME-TO-LIVE) GUEST CLEANUP INDEX
 * Automatically deletes abandoned Guest Carts after 30 days of inactivity.
 * 2592000 seconds = 30 days.
 * Only applies to carts where userId is null (We do not auto-delete user carts).
 */
cartSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { userId: { $eq: null } }
  }
)

export default mongoose.model('Cart', cartSchema)
