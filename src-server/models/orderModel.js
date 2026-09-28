import mongoose from 'mongoose'

// ==========================================
// 📦 ORDER ITEM SCHEMA (SNAPSHOT)
// ==========================================
/**
 * Sub-schema for individual products within an order.
 * These fields are snapshots of the product state at the time of purchase.
 */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    // 🌟 MULTI-VENDOR: Who sold this specific item?
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    title: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    // 🌟 NEW: The exact fee owed by THIS specific seller for THIS specific item
    platformFee: {
      type: Number,
      default: 0
    },
    size: {
      type: String
    },
    sizeId: {
      type: String
    },
    image: {
      type: String
    }
  },
  { _id: false }
)

// ==========================================
// 🧾 MAIN ORDER SCHEMA
// ==========================================
/**
 * Schema for customer orders.
 * Handles both authenticated user history and anonymous guest checkouts.
 */
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    contactInfo: {
      email: { type: String, required: true },
      firstName: { type: String },
      lastName: { type: String },
      phone: { type: String }
    },

    shippingAddress: {
      address: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String }
    },

    items: [orderItemSchema],

    // 🌟 NEW: Total platform fee the buyer absorbed during checkout
    platformFeeTotal: {
      type: Number,
      default: 0
    },

    platformFeeCharged: {
      type: Boolean,
      default: false
    },

    scoreAwarded: {
      confirmed: { type: Boolean, default: false },
      shipped: { type: Boolean, default: false }
    },

    // Financial Totals (Subtotal + Shipping + platformFeeTotal)
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },

    locale: {
      type: String,
      default: 'en-US'
    },

    paymentMethod: {
      type: String,
      required: true
    },

    transactionId: {
      type: String,
      default: null
    },

    digitalKey: { type: String, default: null },

    isPaid: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      default: 'pending'
    },

    note: {
      type: String
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model('Order', orderSchema)
