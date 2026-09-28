import mongoose from 'mongoose'

// ==========================================
// ⭐ PRODUCT RATING SUB-SCHEMA
// ==========================================
const ratingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  },
  { _id: false }
)

// ==========================================
// 📏 PRODUCT SIZES SUB-SCHEMA (NEW!)
// ==========================================
const sizeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g., 'xl'
    size: { type: String, required: true }, // e.g., 'XL' or '42'
    qty: { type: Number, default: 0 } // Inventory for this specific size
  },
  { _id: false }
)

// ==========================================
// 📦 MAIN PRODUCT SCHEMA
// ==========================================
const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ------------------------------------------
    // 🌟 THE UNIVERSAL TRUTHS (MOVED TO ROOT!)
    // ------------------------------------------

    productType: {
      type: String,
      enum: ['physical', 'digital'],
      default: 'physical'
    },

    isPlatformService: {
      type: Boolean,
      default: false
    },

    price: { type: Number, required: true, default: 0 },
    discountPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 }, // Base inventory (if no sizes)
    sizes: { type: [sizeSchema], default: [] }, // Array of physical sizes

    // ------------------------------------------
    // Analytics & Categories
    // ------------------------------------------
    rating: { type: Number, default: 0 },
    ratings: [ratingSchema],
    views: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    categories: { type: [String], default: [] },

    // ------------------------------------------
    // 🗣️ LOCALIZATION (Strictly Text & Images now)
    // ------------------------------------------
    locales: { type: Object, default: {} }
  },
  { timestamps: true }
)

export default mongoose.model('Product', productSchema)
