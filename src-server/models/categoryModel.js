import mongoose from 'mongoose'

// ==========================================
// 🗂️ SUB-CATEGORY SCHEMA
// ==========================================
/**
 * Sub-schema for nested child categories.
 * Stored as an array within the main Category document.
 */
const subCategorySchema = new mongoose.Schema(
  {
    link: {
      type: String,
      default: ''
    },
    // Custom string identifier (e.g., 'men-clothing')
    id: {
      type: String,
      required: true
    },
    // Dynamic dictionary for translated titles
    title: {
      type: Object,
      default: { 'en-US': 'SubCategory Name' }
    }
  },
  { _id: false } // 👈 PRO TIP: Prevents Mongoose from auto-generating random Mongo ObjectIDs for sub-items
)

// ==========================================
// 🗂️ MAIN CATEGORY SCHEMA
// ==========================================
/**
 * Defines the structure for the store's product categories.
 * Supports a 2-level hierarchy (Parent -> Child) and localized content.
 */
const categorySchema = new mongoose.Schema({
  // URL slug or routing link
  link: {
    type: String,
    default: ''
  },

  // Custom unique string identifier (e.g., 'men', 'electronics')
  id: {
    type: String,
    required: true,
    unique: true
  },

  // Dynamic dictionary for translated titles
  // Example: { 'en-US': 'Electronics', 'sr-Latn-RS': 'Elektronika' }
  title: {
    type: Object,
    default: { 'en-US': 'Category Name' }
  },

  // Array of nested sub-categories utilizing the schema defined above
  sub: [subCategorySchema],

  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('Category', categorySchema)
